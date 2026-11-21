import { existsSync } from 'node:fs';
import { join } from 'node:path';
import util from 'node:util';

import { jest } from '@jest/globals';
import { ConstraintError } from 'helpful-errors';

import { useTestdbPortOverride } from './src/.test/assets/database/useTestdbPortOverride';
import { useWakeOfTestdb } from './src/.test/useWakeOfTestdb';

jest.setTimeout(90000); // since we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new ConstraintError(
    'no package.json found in cwd — run the integration suite from the git root',
    { cwd: process.cwd() },
  );

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' ||
    (process.env.CONFIG && process.env.CONFIG !== 'test')) &&
  process.env.I_KNOW_THE_RISKS !== 'true'
)
  throw new ConstraintError(
    `integration.test config must be 'test' — set NODE_ENV=test and CONFIG=test (or I_KNOW_THE_RISKS=true to override)`,
    { nodeEnv: process.env.NODE_ENV ?? null, config: process.env.CONFIG ?? null },
  );

/**
 * .what = declare this checkout's testdb port as TESTDB_PORT, before any test opens a connection.
 * .why = a worktree's testdb binds a port of its own; the app dials TESTDB_PORT under test access,
 *        so a worktree's suite reaches its own db, never another checkout's.
 */
useTestdbPortOverride();

/**
 * .what = preflight the LOCAL testdb when this service declares its own db (databaseUserName).
 * .why = prevent time wasted on a suite that fails deep in a query because the local testdb was never
 *        provisioned, or was provisioned for a different repo; useWakeOfTestdb fails loud and names
 *        the fix. it is the LOCAL own-db half; the shared prep cluster its peers query is woken by
 *        useWakeOfLivedb in globalSetup, since both test and prep access reach the prep peers.
 */
useWakeOfTestdb();
