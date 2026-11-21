import { execFileSync } from 'node:child_process';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = verify the local testdb is reachable, via a `SELECT 1` preflight, before a suite runs.
 * .why  = this preflight runs at jest-setup load, so its error is the first output a surfer reads
 *         when the testdb is unreachable. the prior form redirected psql's stderr to `/dev/null` and
 *         threw one hardcoded cause ("did you forget to start:testdb?"), so EVERY cause -- an absent
 *         psql binary, a bad password, an unapplied schema, a 3s timeout -- collapsed into a message
 *         that named only the likeliest and pointed away from the rest (a swallowed error). this
 *         surfaces psql's own words instead. it is split out of `jest.integration.env.ts` (a
 *         jest-setup module whose logic cannot be unit-tested in place) so the failure path is a pure
 *         fn with the `exec` boundary injected, and both the real-stderr path and the empty-stderr
 *         path are clamped + snapped.
 * .note = PGPASSWORD rides in `env`, never in the command args. node puts the failed command verbatim
 *         onto the thrown error's message, so a password passed as an arg would reach any log that
 *         prints that error. the args are an argv array (no shell), so a config value with shell
 *         metacharacters cannot be interpreted either (no injection).
 * .note = a failed preflight is CALLER-must-fix (a local testdb the human starts), so it throws a
 *         ConstraintError (exit 2) that NAMES the fix and PRESERVES psql's stderr on the chain -- a
 *         consumer can tell "not started" from "bad password" from "psql absent"
 *         (a caller-must-fix ConstraintError, exit 2).
 */
export const probeTestDb = (
  input: {
    host: string;
    port: number | string;
    username: string;
    password: string;
    database: string;
  },
  context: { exec?: typeof execFileSync } = {},
): void => {
  const exec = context.exec ?? execFileSync;

  try {
    exec(
      'psql',
      [
        '-h',
        String(input.host),
        '-p',
        String(input.port),
        '-U',
        input.username,
        '-d',
        input.database,
        '-c',
        'SELECT 1',
      ],
      {
        timeout: 3000,
        // stdout ignored (the SELECT 1 result is noise); stderr piped so psql's words reach the human
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, PGPASSWORD: input.password },
      },
    );
  } catch (error) {
    // surface what psql actually said; a bare catch collapses every cause into one guess
    // .note = a documented cast: node types a caught value as unknown, and execFileSync's error
    //         carries `stderr` as a Buffer (piped above); the `'stderr' in error` guard proves the key
    const said =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr?: Buffer }).stderr ?? '').trim()
        : '';
    // psql SPOKE => it reached the server, so the container is UP and the fault is auth/schema, NOT
    // a down container -- `start:testdb` is already what the surfer ran to get here, so it is the
    // wrong first move for a bad password / unapplied schema. name the credential + schema check,
    // and keep the start command only as the container-down fallback. the SILENT decline (no stderr:
    // absent psql / timeout) is the one cause that actually points at a down container.
    const fix = said
      ? [
          'fix: psql reached the server, so the container is UP -- the fault is likely auth or schema:',
          '  - check the crud user + password in config/test.json match what the testdb was seeded with',
          "  - check this service's schema was applied to the testdb",
          '  - only if the container is in fact down, run `npm run start:testdb`',
        ].join('\n')
      : 'fix: run `npm run start:testdb`';
    throw new ConstraintError(
      [
        `cant connect to the testdb at ${input.host}:${input.port}`,
        '',
        'psql said:',
        `  ${said || '(no stderr -- psql may be absent from PATH, or the call timed out)'}`,
        '',
        fix,
      ].join('\n'),
      // a catch binds `unknown` under strictest, and `cause` is typed `Error`; narrow, never cast,
      // so a non-Error throw is re-homed into an Error rather than dropped
      { cause: error instanceof Error ? error : new Error(String(error)) },
    );
  }
};
