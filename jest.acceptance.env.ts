import { existsSync } from 'node:fs';
import { join } from 'node:path';
import util from 'node:util';

import { jest } from '@jest/globals';
import { ConstraintError } from 'helpful-errors';

import { useTestdbPortOverride } from './src/.test/assets/database/useTestdbPortOverride';

jest.setTimeout(90000); // we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new ConstraintError(
    'no package.json found in cwd — run the acceptance suite from the git root',
    { cwd: process.cwd() },
  );

/**
 * .what = align CONFIG with ACCESS, before any test imports the environment.
 * .why =
 *   - jest forces NODE_ENV=test, and sdk-environment derives config from NODE_ENV before access.
 *     so a cloud run with ACCESS=prep still read config/test.json, and a request built from config
 *     (e.g. a twilio signature) failed with prep access.
 *   - `envStatic` caches at first import, so the alignment must land here, per worker, before the
 *     first test imports `src/utils/environment`.
 *   - an in-process run (LOCALLY=true) holds no ACCESS, so it stays on `test`. a cloud run with no
 *     ACCESS never reaches here: jest.acceptance.prepare.ts stops it first.
 * .note = keyrack is sourced once per run in jest.acceptance.prepare.ts, not here.
 */
const access = process.env.ACCESS ?? 'test';
process.env.ACCESS = access;
process.env.CONFIG = access;

/**
 * .what = declare this checkout's testdb port as TESTDB_PORT, for an in-process run with test access.
 * .why = an in-process run opens the local testdb from this worker; a worktree's testdb binds a port
 *        of its own, which the app dials only under test access. prep and prod access never read it.
 */
if (access === 'test') useTestdbPortOverride();
