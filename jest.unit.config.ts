/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

// ensure tests run in utc, like they will on cicd and on server; https://stackoverflow.com/a/56277249/15593329
process.env.TZ = 'UTC';

// ensure tests run like on local machines, so snapshots are equal on local && cicd
process.env.FORCE_COLOR = 'true';

// https://jestjs.io/docs/configuration
const config: Config = {
  verbose: true,
  reporters: [
    ['default', { summaryThreshold: 0 }], // ensure we always get a failure summary at the bottom, to avoid the hunt
    ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.log/slowtest/unit.report.json' }],
  ],
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    // here's an example of how to ignore esm module transformation, when needed
    // 'node_modules/(?!(@octokit|universal-user-agent|before-after-hook)/)',
  ],
  testMatch: [
    // note: order matters
    '**/*.test.ts', // also matches the `._.unit.test` kind seam
    '!**/*.acceptance.test.ts',
    '!**/*.integration.test.ts',
    '!**/*.evaluation.test.ts',
    '!**/*._.acpt.test.ts',
    '!**/*._.intg.test.ts',
    '!**/*._.eval.test.ts',
    '!**/.agent/.actors/**', // rhachet host-local state; holds a scratch clone of this repo, whose suites are not ours
    '!**/.agent/.cache/**',
    '!**/.yalc/**',
  ],
  // skip all of `.agent/`: rhachet roles, host-local clones, and the rmsafe trash live there. a test
  // there would run as ours, and a snapshot there would read as obsolete (the haste map scans it)
  testPathIgnorePatterns: ['/node_modules/', '/.agent/'],
  modulePathIgnorePatterns: ['<rootDir>/.agent/'],
  setupFilesAfterEnv: ['./jest.unit.env.ts'],

  // reclaim every temp dir genTempDir made this run (test-fns autoprune; needs test-fns >=1.16,
  // the floor is 1.17). jest needs BOTH keys -- globalSetup stamps the run, globalTeardown reclaims
  // its dirs. one key without the other stamps and never reclaims, a half-wired state test-fns itself
  // detects + reports at runtime.
  globalSetup: 'test-fns/autoprune.setup.jest',
  globalTeardown: 'test-fns/autoprune.teardown.jest',

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
