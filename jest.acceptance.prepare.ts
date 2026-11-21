import autopruneSetup from 'test-fns/autoprune.setup.jest';

import { getOneKeyrackEnvForAcceptance, useKeyrack } from './src/.test/useKeyrack';
import { useWakeOfLivedb } from './src/.test/useWakeOfLivedb';

/**
 * .what = jest globalSetup for the acceptance suite — runs once, in the main process, before
 *         jest forks its workers.
 * .why =
 *   - COMPOSES three setups that each need this one hook: the livedb wake (resume the shared
 *     aurora-serverless cluster so the first query does not cold-start past the timeout), the
 *     keyrack source (credentials for the run's access), and test-fns autoprune (mint this run's id
 *     BEFORE the first fork, so genTempDir dirs are reclaimed). jest allows ONE globalSetup, so a
 *     service that needs all three must compose them here rather than pick one — a bare
 *     `globalSetup: 'test-fns/autoprune.setup.jest'` (the shipped default) leaves the db un-woken,
 *     and a bare wake setup drops autoprune (every dir stamped, none reclaimed — the
 *     half-wired state).
 *   - the acceptance suites invoke deployed lambdas that proxy to peers which query the shared
 *     cluster; a paused cluster cold-starts past the timeout and flakes the quote suites. wake
 *     it once here (not per-file — env setup runs per worker), so the first real query lands warm.
 *   - the target access is named FIRST: a cloud run with no ACCESS and no LOCALLY=true stops at
 *     once with the fix, rather than source the test keyrack over a prep target and hang.
 *   - then the wake (best-effort, self-gated on a declared db tunnel), THEN keyrack, THEN autoprune
 *     mints the run id. keyrack after the wake, so the run's access creds never leak into the
 *     `rhx use.rds.capacity --env prep` call the wake makes.
 *   - keyrack is sourced ONCE per run here, not once per suite file in the env file. jest
 *     forks its workers after globalSetup, so each worker inherits the env it sets.
 *   - `globalConfig` is FORWARDED to autoprune unchanged: test-fns reads its `globalTeardown`
 *     slot to detect the half-wired state, and a dropped/defaulted arg would falsely accuse a
 *     correctly-wired consumer (see test-fns autoprune.setup.jest .note).
 * .note = each util is imported by RELATIVE path, never the `@src` alias — a globalSetup is
 *         loaded by node's plain require BEFORE jest's moduleNameMapper exists, so `@src` here
 *         fails with `Cannot find module` and kills the run at startup (the same trap test-fns'
 *         own autoprune.setup.jest documents).
 */
// biome-ignore lint/style/noDefaultExport: jest globalSetup api requires default export
export default async (globalConfig: { globalTeardown?: string | null }): Promise<void> => {
  // name the target access, or stop with the fix
  const access = getOneKeyrackEnvForAcceptance({ env: process.env });

  // the wake TARGET is always the prep cluster: a test-access AND a prep-access suite both fan out
  // to the shared prep peer fleet, so 'prep' is
  // the one cluster either access reaches; only prod is self-contained and never woken.
  await useWakeOfLivedb({ env: 'prep', reaches: 'via-tunnel' });

  // source the credentials for the run's access once for the run; `strict` fails fast if keyrack
  // is locked or a key is absent
  useKeyrack({ env: access, mode: 'strict' });

  await autopruneSetup(globalConfig);
};
