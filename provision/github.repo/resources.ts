import type { DeclastructProvider } from 'declastruct';
import {
  type DeclaredGithubBranch,
  DeclaredGithubBranchProtection,
  DeclaredGithubEnvironment,
  type DeclaredGithubOrg,
  DeclaredGithubRepo,
  DeclaredGithubRepoConfig,
  DeclaredGithubRepoRuleset,
  type DeclaredGithubTeam,
  DeclaredGithubTeamRepoAccess,
  getDeclastructGithubProvider,
} from 'declastruct-github';
import { UnexpectedCodePathError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import pkgJson from '../../package.json';
import { type DomainEntity, RefByUnique } from '../../src';

const pkg = pkgJson as {
  description?: string;
  private?: boolean;
  homepage?: string;
};

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructGithubProvider(
    {
      credentials: {
        token:
          process.env.GITHUB_TOKEN ??
          UnexpectedCodePathError.throw('github token not supplied'),
      },
    },
    {
      // MUST be an sdk-logs logger — 1.6.0 DAOs read log._.level via as-procedure
      log: genLogMethods(),
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // declare the repo
  const repo = DeclaredGithubRepo.as({
    owner: 'ehmpathy',
    name: 'domain-objects',
    description: pkg.description ?? null,
    visibility: pkg.private === false ? 'public' : 'private', // fail closed: public only via an explicit `"private": false`
    homepage: pkg.homepage ?? null,
    archived: false,
  });

  // ref the main branch
  const branchMain = RefByUnique.as<typeof DeclaredGithubBranch>({
    name: 'main',
    repo,
  });

  // declare config for the repo
  const repoConfig = DeclaredGithubRepoConfig.as({
    repo,

    // explicitly set the main branch
    defaultBranch: branchMain.name,

    // we only use issues; the rest is noise today
    hasIssues: true,
    hasProjects: false,
    hasWiki: false,
    isTemplate: false,

    // only squash merges are allowed
    allowSquashMerge: true,
    allowMergeCommit: false, // but especially not merge merges. never merge merges
    allowRebaseMerge: false,

    // allow nice to haves for pulls
    allowAutoMerge: true,
    allowUpdateBranch: true,

    // always cleanup after yourself
    deleteBranchOnMerge: true,

    // configure messages
    mergeCommitMessage: 'PR_TITLE',
    mergeCommitTitle: 'MERGE_MESSAGE',
    squashMergeCommitMessage: 'COMMIT_MESSAGES',
    squashMergeCommitTitle: 'COMMIT_OR_PR_TITLE',
    webCommitSignoffRequired: false,
  });

  // declare protection for that branch, too
  const branchMainProtection = DeclaredGithubBranchProtection.as({
    branch: branchMain,

    enforceAdmins: true, // admins too; an exception means a deliberate settings change
    allowsDeletions: false,
    allowsForcePushes: false,
    requireLinearHistory: false, // squash-only merges (repoConfig) already keep history linear

    requiredStatusChecks: {
      strict: true, // the branch must be up to date, so a green check holds after the merge
      contexts: [
        'suite / install / pnpm',
        'suite / enshard',
        'suite / test-commits',
        'suite / test-types',
        'suite / test-format',
        'suite / test-lint',
        'suite / test-unit',
        'suite / test-integration',
        'suite / test-acceptance-locally',
        'pullreq-title',
      ],
    },

    // github's defaults, declared so drift shows in a plan
    allowForkSyncing: false,
    blockCreations: false,
    lockBranch: false,
    requiredConversationResolution: false,
    requiredPullRequestReviews: null,
    requiredSignatures: false,
    restrictions: null,
  });

  // ref the releasers team
  const teamReleasers = RefByUnique.as<typeof DeclaredGithubTeam>({
    org: RefByUnique.as<typeof DeclaredGithubOrg>({
      login: 'ehmpathy',
    }),
    slug: 'releasers',
  });

  // grant the releasers team push access to the repo (standalone; no env depends on it)
  const teamReleasersRepoAccess = DeclaredGithubTeamRepoAccess.as({
    team: teamReleasers,
    repo,
    permission: 'push', // write access needed to deploy
  });

  // declare the sole preparation environment — one env for every prep/test deploy
  const envPreparation = DeclaredGithubEnvironment.as({
    repo,
    name: 'preparation',
    reviewers: null, // no approval — prep is the pre-production tier; feature branches deploy freely
    waitTimer: null, // no delay
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false,
  });

  // declare environment for production deployments from main (auto-approved)
  const envProductionOnMain = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-main',
    reviewers: null, // no approval required — PR merge is the gate
    waitTimer: null, // no delay
    deploymentBranchPolicy: {
      // admit `v*` tags beside main: a prod deploy is triggered by a release tag cut from main
      customPatterns: [
        { name: 'main', target: 'branch' },
        { name: 'v*', target: 'tag' },
      ],
    },
    preventSelfReview: false,
  });

  // declare environment for adhoc production apply from a non-main branch
  // .why = its name is the oidc `sub` anchor of the WRITER role, gated in aws by an `actor_id`
  //        allowlist. do NOT merge it with production-on-else-plan, or a plan job could write
  const envProductionOnElseApply = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-else-apply',
    reviewers: null, // do NOT add reviewers: off enterprise plans, a private repo's api returns 422
    waitTimer: null,
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false,
  });

  // declare environment for production plan from any branch (readonly, no approval)
  // .why = its name is the oidc `sub` anchor of the READONLY plan role
  const envProductionOnElsePlan = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-else-plan',
    reviewers: null, // no approval required — plan is readonly, safe
    waitTimer: null, // no delay
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false,
  });

  // restrict who may cut `v*` release tags to the rhelease app only
  // .why = prod apply is gated on a release tag; a tag anyone could push is no gate
  const rulesetReleaseTags = DeclaredGithubRepoRuleset.as({
    repo,
    name: 'protect-release-tags',
    target: 'tag',
    enforcement: 'active',

    // only the rhelease github app may create `v*` tags
    bypassActors: [
      {
        actorId: 2472031, // rhelease github app id (gh api /apps/rhelease)
        actorType: 'Integration',
        bypassMode: 'always',
      },
    ],

    // applies to release tags only
    conditions: {
      refNameInclude: ['refs/tags/v*'],
      refNameExclude: [],
    },

    // a cut release tag is immutable: only the bypass actor may create, move, or delete it
    rules: [{ type: 'creation' }, { type: 'update' }, { type: 'deletion' }],
  });

  // and return the full set
  return [
    repo,
    repoConfig,
    branchMainProtection,
    teamReleasersRepoAccess,
    envPreparation,
    envProductionOnMain,
    envProductionOnElseApply,
    envProductionOnElsePlan,
    rulesetReleaseTags,
  ];
};
