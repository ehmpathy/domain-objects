import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';

import { probeTestDb } from '../../jest.integration.env.db';

/**
 * .what = the port the local testdb binds, as the app dials it
 * .why = a worktree's testdb binds a port of its own, which the harness declares as TESTDB_PORT
 *        (useTestdbPortOverride) and the app dials under test access. the wake must probe that
 *        same port, or in a worktree it probes the default port and finds no db, or finds another
 *        worktree's db
 * .note = absent TESTDB_PORT, the testdb binds the declared port
 */
const getTestdbPortForWake = (input: { portDeclared: number }): number => {
  // no override declared; the testdb binds the declared port
  const portOverride = process.env.TESTDB_PORT;
  if (portOverride === undefined || portOverride === '')
    return input.portDeclared;

  // a malformed override fails loud, so the wake never probes a port no db binds
  if (!/^[0-9]+$/.test(portOverride))
    throw new ConstraintError('TESTDB_PORT is not a valid port', {
      portOverride,
      hint: 'set TESTDB_PORT to a positive integer port, or unset it to probe the declared port',
    });
  return Number(portOverride);
};

/**
 * .what = preflight the LOCAL testdb before a suite runs, when this service declares its own db.
 * .why =
 *   - prevent time wasted on a suite that fails deep in a query because the local testdb was never
 *     provisioned, or was provisioned for a DIFFERENT repo (an opaque "password authentication
 *     failed" surfaced far from its cause).
 *   - the gate is a declared db: a `databaseUserName` in `declapract.use.yml` is the signal this
 *     service OWNS a db (persist-with-rds), so it needs a local testdb. a service that declares none
 *     is a no-op here.
 *   - the check fails LOUD and CALLER-must-fix (a local testdb the human starts) via a ConstraintError
 *     that names the fix — `probeTestDb` surfaces psql's own stderr so the consumer can tell "not
 *     started" from "bad password" from "psql absent" (never a swallowed error).
 * .note = this is the LOCAL own-db counterpart to `useWakeOfLivedb` (the shared prep cluster wake).
 *         the two form a symmetric pair, but differ in one honest way: `useWakeOfLivedb` RESUMES a
 *         paused cluster; this one only PREFLIGHTS the local testdb — it cannot start it, so it fails
 *         loud with the `start:testdb` fix rather than resume it. the name reads "wake" for symmetry
 *         with its pair; the act is a readiness preflight.
 * .note = the LIVEDB half of a suite's db needs — the shared prep cluster its peers query — is woken
 *         separately by `useWakeOfLivedb` in globalSetup, since both test and prep access reach the
 *         deployed prep peers.
 */
export const useWakeOfTestdb = (): void => {
  // gate: does this service own a db? a declared databaseUserName in declapract.use.yml is the signal.
  const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
  const declapractUseContent = existsSync(declapractUsePath)
    ? readFileSync(declapractUsePath, 'utf8')
    : '';
  const requiresTestDb = declapractUseContent.includes('databaseUserName');
  if (!requiresTestDb) return;

  // an own-db service without config/test.json cannot preflight — name the fix (author the config)
  const testConfigPath = join(process.cwd(), 'config', 'test.json');
  if (!existsSync(testConfigPath))
    throw new ConstraintError(
      'config/test.json not found but a databaseUserName is declared in declapract.use.yml — author config/test.json with the testdb tunnel + role',
      { testConfigPath },
    );

  // a present-but-incomplete config fails loud, and names the exact keys the preflight needs
  const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf8'));
  if (
    !testConfig.database?.tunnel?.local ||
    !testConfig.database?.role?.crud ||
    !testConfig.database?.target?.database
  )
    throw new ConstraintError(
      'config/test.json lacks an expected key — declare database.tunnel.local, database.role.crud, and database.target.database',
      {
        hasTunnelLocal: !!testConfig.database?.tunnel?.local,
        hasRoleCrud: !!testConfig.database?.role?.crud,
        hasTargetDatabase: !!testConfig.database?.target?.database,
      },
    );

  // preflight the testdb; probeTestDb surfaces psql's own stderr on failure (never a swallowed
  // error) and passes PGPASSWORD via env, never the command args
  probeTestDb({
    host: testConfig.database.tunnel.local.host,
    port: getTestdbPortForWake({
      portDeclared: testConfig.database.tunnel.local.port,
    }),
    username: testConfig.database.role.crud.username,
    password: testConfig.database.role.crud.password,
    database: testConfig.database.target.database,
  });
};
