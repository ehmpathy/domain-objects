import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { keyrack } from 'rhachet/keyrack';

/**
 * .what = parse the `export KEY=VALUE` lines of `aws ... export-credentials --format env` into a
 *         `{ KEY: VALUE }` record.
 * .why  = names the line-parse as one pure transform, so `exportAwsCredentialsFromSsoProfile` reads
 *         what-not-how rather than an inline positional `match[1]!`/`match[2]!` decode a reader must
 *         simulate. pure + boundary-free, so it is testable without the exec stub.
 */
const asCredentialsRecordFromExportLines = (input: {
  output: string;
}): Record<string, string> =>
  Object.fromEntries(
    input.output
      .split('\n')
      .map((line) => line.match(/^export\s+(\w+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map(([, key, value]) => [key!, value!] as const),
  );

// an sso refresh is network-bound (identity-provider round-trip); a slow-but-valid refresh must not
// read as a dead login. bound it generously, and name the budget so it is not a silent magic number.
const SSO_EXPORT_TIMEOUT_MS = 30000;

/**
 * .what = export the aws credentials of an sso profile into a `{ KEY: VALUE }` record, via
 *         `aws configure export-credentials --format env`.
 * .why  = static creds in env pin every aws caller in the suite (sdk-aws-lambda's v3 LambdaClient,
 *         and any v2 client a consumer still holds) to the keyrack profile's access, whether or not
 *         the sdk can derive sso from a profile. this is the pure, injectable core of that export. it is a pure fn with the `exec` boundary injected,
 *         so the failure path AND the all-clear path are both clamped + snapped.
 * .note = a failed export is CALLER-must-fix (a stale/absent sso login), so it throws a
 *         `ConstraintError` (exit 2) that NAMES the fix and PRESERVES the real cause on the chain —
 *         a consumer can machine-distinguish "not logged in" from a malfunction a retry would fix
 *         (a caller-must-fix ConstraintError, exit 2, over a server malfunction). the profile is passed as an
 *         argv element, never interpolated into a shell string, so a profile with shell
 *         metacharacters cannot be interpreted (no injection).
 */
export const exportAwsCredentialsFromSsoProfile = (
  input: { profile: string },
  context: { exec?: typeof execFileSync } = {},
): Record<string, string> => {
  const exec = context.exec ?? execFileSync;

  // shell out to the aws cli for the profile's static creds; a failure here is caller-must-fix.
  // an iife keeps the result a const (no `let` reassignment across the try) per immutable-vars.
  const credOutput = ((): string => {
    try {
      // note = `as string` at an external boundary (node child_process types). with
      //        `encoding: 'utf8'` execFileSync returns a string, but its overloads widen
      //        to `string | Buffer` when the options object is passed as a variable rather
      //        than an inline literal. correct type = `string`. removal path = pass the
      //        options as an inline literal, or when @types/node narrows the dynamic-options
      //        overload to honor a string `encoding` value.
      return exec(
        'aws',
        [
          'configure',
          'export-credentials',
          '--profile',
          input.profile,
          '--format',
          'env',
        ],
        { encoding: 'utf8', timeout: SSO_EXPORT_TIMEOUT_MS },
      ) as string;
    } catch (error) {
      throw new ConstraintError(
        `failed to export aws credentials from sso profile '${input.profile}'. run: aws sso login --profile ${input.profile}`,
        // a catch binds `unknown` under strictest, and `cause` is typed `Error`; narrow, never
        // cast, so a non-Error throw is re-homed into an Error rather than dropped
        { cause: error instanceof Error ? error : new Error(String(error)) },
      );
    }
  })();

  // parse the `export KEY=VALUE` lines into a record the caller can splice into process.env
  return asCredentialsRecordFromExportLines({ output: credOutput });
};

/**
 * .what = splice the sso profile's static creds into `env` and REMOVE AWS_PROFILE, so every aws
 *         caller in the suite authenticates with those creds.
 * .why  = both aws sdks prefer AWS_PROFILE over static env creds when both are present: v3's
 *         default provider skips `fromEnv` once AWS_PROFILE is set (sdk-aws-lambda's LambdaClient is
 *         v3), and v2 cannot derive an sso profile from AWS_PROFILE at all. a splice of static creds
 *         AND a removal of AWS_PROFILE makes both use them. this is the single practice-owned guard,
 *         so every repo that invokes lambdas in tests inherits it rather than rediscovers it after
 *         an opaque credential failure. it is shared by BOTH jest envs (acceptance + integration)
 *         via useKeyrack, so the gap is guarded once.
 * .note = `env` is injected so the splice + the AWS_PROFILE removal are clamped without a real
 *         process.env mutation; the caller passes process.env. `exportCreds` is injected too, so the
 *         whole path is a pure fn with both boundaries mockable.
 * .note = the splice is scoped to an `AWS_`-prefixed allowlist, never every key the cli emits. `aws
 *         configure export-credentials --format env` emits only `AWS_*` creds today; the allowlist
 *         keeps a future cli line, a proxy banner, or a nested-util var out of the shared process
 *         env (no hidden side effect on an unrelated key). the AWS_PROFILE removal is DELIBERATE and must
 *         persist for the suite lifetime — the sdk prefers AWS_PROFILE over static creds, so a "restore"
 *         would reintroduce the exact auth-against-no-target bug this guard exists to close; it is
 *         scoped to the injected `env`, so a test clamps it without a real process.env edit.
 */
const AWS_CRED_KEY_PREFIX = 'AWS_';
export const spliceAwsStaticCredsIntoEnv = (
  input: { profile: string },
  context: {
    env: NodeJS.ProcessEnv;
    exportCreds?: typeof exportAwsCredentialsFromSsoProfile;
  },
): void => {
  const exportCreds = context.exportCreds ?? exportAwsCredentialsFromSsoProfile;

  // splice ONLY the `AWS_`-prefixed creds — never an arbitrary key the cli happens to emit
  const creds = exportCreds({ profile: input.profile });
  for (const [key, value] of Object.entries(creds))
    if (key.startsWith(AWS_CRED_KEY_PREFIX)) context.env[key] = value;

  // the sdk prefers AWS_PROFILE over static creds when both are set, so remove it now that creds are spliced
  delete context.env.AWS_PROFILE;
};

/**
 * .what = read the sso profile from `env.AWS_PROFILE`, or throw a ConstraintError that NAMES the fix.
 * .why  = both aws jest envs need an sso profile, which keyrack.source sets from the consumer's
 *         `.agent/keyrack.yml`. when that manifest never declares AWS_PROFILE, keyrack sets no key
 *         and this guard fires — so the error must name the exact key to add, not blame
 *         keyrack.source (which did its job). the gap: the practice cannot ship the consumer's
 *         keyrack.yml (it is a gitignored, consumer-local file), so it instead tells the consumer
 *         precisely what to declare, and every aws consumer inherits that one coherent guard+message
 *         (an error that names the fix) rather than re-derive it from an opaque credential miss.
 * .note = caller-must-fix (the manifest lacks a key), so a ConstraintError (exit 2). `env` is
 *         injected so both the present and absent paths are clamped without a real process.env read;
 *         the caller passes process.env.
 */
export const getOneAwsSsoProfileFromEnv = (
  input: Record<string, never>,
  context: { env: NodeJS.ProcessEnv },
): string => {
  const profile = context.env.AWS_PROFILE;
  if (!profile)
    throw new ConstraintError(
      'AWS_PROFILE not set. declare it in .agent/keyrack.yml (under env.test, and env.all so every access sources it), so keyrack.source() can set it.',
    );
  return profile;
};

/**
 * .what = source aws credentials from keyrack for the run's access and export them to `process.env`
 *         in ONE call — the single entrypoint both jest envs use for credential setup.
 * .why  = a jest env must not hand-roll the keyrack.source -> set ACCESS -> static-cred export
 *         sequence inline; that spreads one concern across every env and drifts between them. this is
 *         the org `useKeyrack` convention (svc-jobs / svc-notifications), so a consumer reads one
 *         line rather than re-derives the sequence. it composes the injectable leaves above, so this
 *         repo's test-coverage standard holds — the failure + all-clear paths stay clamped, unlike a
 *         verbatim inline port.
 * .how  =
 *   1. skip in CI (credentials arrive from secrets, not keyrack)
 *   2. skip if the consumer declares no `.agent/keyrack.yml`
 *   3. keyrack.source for the access (sets AWS_PROFILE)
 *   4. set ACCESS for sdk-environment when the access is not `test`
 *   5. if static creds are already present, clear AWS_PROFILE so the sdk prefers them, and return
 *   6. else, when the consumer requires aws auth, export the sso profile's static creds via the
 *      shared static-cred guard
 * .note = `mode` defaults to `lenient` (the org useKeyrack default). when the repo declares aws
 *         auth, keyrack is sourced `strict` regardless, so an absent aws key fails loud.
 * .note = when the repo declares aws auth, the ec2 metadata service is barred
 *         (`AWS_EC2_METADATA_DISABLED=true`), so the sdk credential chain can never fall through to a
 *         dev box's instance role and pass against resources the test never meant to touch.
 *         the bar lands AFTER keyrack.source, so keyrack's own vault read is untouched; it lands
 *         BEFORE the static-creds return, so every aws path carries it.
 * .note = called once per run from the `jest.*.prepare.ts` globalSetup; jest workers fork
 *         after globalSetup, so they inherit the env it sets.
 * .note = every boundary (env, cwd, keyrack, file reads, the cred export) is injectable via
 *         `context`, so each gate is clamped without a real process.env edit or fs read.
 */
export const useKeyrack = (
  input?: {
    env?: 'test' | 'prep' | 'prod';
    owner?: string;
    mode?: 'strict' | 'lenient';
  },
  context: {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    keyrack?: {
      source: (input: {
        env: string;
        owner: string;
        mode?: 'strict' | 'lenient';
      }) => void;
    };
    readText?: (input: { path: string }) => string | null;
    exportCreds?: typeof exportAwsCredentialsFromSsoProfile;
  } = {},
): void => {
  const processEnv = context.env ?? process.env;
  const cwd = context.cwd ?? process.cwd();
  const keyrackSdk = context.keyrack ?? keyrack;
  const readText = context.readText ?? readTextOrNull;
  const env =
    input?.env ?? ((processEnv.ACCESS ?? 'test') as 'test' | 'prep' | 'prod');
  const owner = input?.owner ?? 'ehmpath';

  // skip in CI — credentials arrive from secrets, not from a local keyrack
  if (processEnv.CI) return;

  // skip if the consumer declares no keyrack manifest
  if (readText({ path: join(cwd, '.agent/keyrack.yml') }) === null) return;

  // only aws consumers need the metadata bar, strict mode, and the static-cred export
  const requiresAwsAuth = isAwsAuthDeclared({
    useYmlText: readText({ path: join(cwd, 'declapract.use.yml') }),
  });

  // source the access's aws profile from keyrack (sets AWS_PROFILE); strict under aws auth
  const mode = requiresAwsAuth ? 'strict' : (input?.mode ?? 'lenient');
  keyrackSdk.source({ env, owner, mode });

  // set ACCESS for sdk-environment when the access is not the default `test`
  if (env !== 'test') processEnv.ACCESS = env;
  if (!requiresAwsAuth) return;

  // bar the ec2 metadata service, so the instance role can never stand in for keyrack creds
  processEnv.AWS_EC2_METADATA_DISABLED = 'true';

  // static creds already present (e.g. exported in the shell) — clear AWS_PROFILE so the sdk prefers
  // the static creds (v2 and v3 both prefer AWS_PROFILE over static creds when both are set), then return
  if (processEnv.AWS_ACCESS_KEY_ID) {
    delete processEnv.AWS_PROFILE;
    delete processEnv.AWS_DEFAULT_PROFILE;
    return;
  }

  // read the sso profile keyrack.source set (throws an error that NAMES the keyrack fix if absent),
  // then splice its static creds into the env for every aws caller in the suite
  const awsSsoProfile = getOneAwsSsoProfileFromEnv({}, { env: processEnv });
  spliceAwsStaticCredsIntoEnv(
    { profile: awsSsoProfile },
    { env: processEnv, exportCreds: context.exportCreds },
  );
};

// the `awsAccountId:` key at the head of its own line: group 1 = its indent, group 2 = the text after
// the colon. the `\s*:` right after the name keeps a longer key (`awsAccountIdLegacy:`) out
const AWS_ACCOUNT_ID_KEY_LINE = /^(\s*)awsAccountId\s*:(.*)$/;

// the yaml scalars that declare a key with no value
const YAML_EMPTY_SCALARS = new Set(['', "''", '""', '~', 'null']);

/**
 * .what = decide whether a key line carries a value on the line itself, after the colon.
 * .why  = `awsAccountId: '123'` declares an account inline; `awsAccountId:` or `awsAccountId: ''`
 *         does not. a ` # note` at the end of the line is a comment, never a value.
 */
const hasInlineYamlValue = (input: { textAfterColon: string }): boolean =>
  !YAML_EMPTY_SCALARS.has(
    input.textAfterColon.replace(/(^|\s)#.*$/, '').trim(),
  );

/**
 * .what = decide whether a key line opens a nested block: the next content line sits deeper.
 * .why  = `awsAccountId:` followed by indented `prep:` / `prod:` lines declares an account per
 *         access. blank lines and comment lines between the key and its block are skipped.
 */
const hasNestedYamlValueBelow = (input: {
  lines: string[];
  index: number;
  indent: string;
}): boolean => {
  const lineNext = input.lines
    .slice(input.index + 1)
    .find((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  if (lineNext === undefined) return false;
  return lineNext.length - lineNext.trimStart().length > input.indent.length;
};

/**
 * .what = decide whether a repo's `declapract.use.yml` declares an aws account: an
 *         `awsAccountId:` KEY with a value, inline or a nested map.
 * .why  = this gates the ec2 metadata bar and strict keyrack mode, so a wrong answer is a security
 *         defect. a bare text match answered yes for a comment or a longer key that held the text,
 *         and so forced strict mode onto a repo with no aws account. this reads the key, not the text.
 * .note = absent file (`null`) declares no aws account. block-style yaml only (the shape
 *         `declapract.use.yml` takes); a flow-style map (`{ awsAccountId: 1 }`) reads as no account.
 */
export const isAwsAuthDeclared = (input: {
  useYmlText: string | null;
}): boolean => {
  if (input.useYmlText === null) return false;
  const lines = input.useYmlText.split('\n');
  return lines.some((line, index) => {
    const keyLine = line.match(AWS_ACCOUNT_ID_KEY_LINE);
    if (!keyLine) return false;
    const [, indent = '', textAfterColon = ''] = keyLine;
    return (
      hasInlineYamlValue({ textAfterColon }) ||
      hasNestedYamlValueBelow({ lines, index, indent })
    );
  });
};

/**
 * .what = read a file's text, or null when it is absent.
 * .why  = the sole fs read of useKeyrack, named so the orchestrator composes it and a test injects
 *         an in-memory view in its place.
 */
const readTextOrNull = (input: { path: string }): string | null => {
  if (!existsSync(input.path)) return null;
  return readFileSync(input.path, 'utf8');
};

/**
 * .what = decide which keyrack env an acceptance run sources: ACCESS when set, `test` for an
 *         in-process run (LOCALLY=true) or a ci runner, else throw.
 * .why  = a cloud acceptance run acts with prep or prod access. a silent `ACCESS ?? 'test'` fallback
 *         sourced the TEST keyrack over a prep target, and the run hung rather than failed.
 *         the run must name its target, so the error names the fix.
 * .note = pure: the env is injected, so every branch is clamped with no process.env read.
 */
export const getOneKeyrackEnvForAcceptance = (input: {
  env: NodeJS.ProcessEnv;
}): 'test' | 'prep' | 'prod' => {
  const access = input.env.ACCESS;

  // an explicit access wins, once it names a real access
  if (access === 'test' || access === 'prep' || access === 'prod') return access;
  if (access)
    throw new ConstraintError(
      `ACCESS=${access} is not a known access. set ACCESS=test|prep|prod.`,
      { access },
    );

  // an in-process run, or a ci runner (keyrack skips there), holds the test access
  if (input.env.LOCALLY === 'true' || input.env.CI) return 'test';

  // a cloud run with no named target must not guess
  throw new ConstraintError(
    'no ACCESS set for a cloud acceptance run. set ACCESS=prep|prod for a cloud acceptance run, or LOCALLY=true for an in-process run.',
  );
};
