import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = wake the shared aurora-serverless cluster before a suite runs, when this
 *         service reaches it — whether it OWNS the db or only invokes peers that do.
 * .why =
 *   - the non-prod cluster is aurora-serverless-v2 at min-capacity 0, so it auto-pauses
 *     when idle; the first downstream query after a pause cold-starts past the 90s test
 *     timeout and flakes the suite (svc-gateway hit this on mAddCrewMember + the quote suites)
 *   - a gateway/fan-out service owns NO db of its own, so a db-ownership signal misses it.
 *     the signal that it REACHES the shared cluster is a tunnel declared in its config —
 *     `config/prep.json`'s `database.tunnel`. that is the self-gate: a tunnel means a query
 *     lands on the cluster (direct or via a peer), so wake it; no tunnel means no-op.
 *   - `rhx use.rds.capacity` opens an ssm tunnel to the cluster and waits for it to accept
 *     connections, which resumes it for every consumer (incl. deployed lambdas), not just
 *     the local caller
 *   - best-effort: a warm db, absent tunnel alias, or absent skill must NEVER break the
 *     suite, so a wake failure is surfaced loud to stderr (not swallowed) and the suite
 *     proceeds — a wake is a latency nicety, not a correctness gate; the suite's own
 *     assertions are the gate
 *   - ci is skipped: creds arrive via oidc and the local ssm-tunnel path is unavailable there,
 *     so ci wakes via the dedicated `start:livedb:prep` workflow step instead
 * .note = this is the LIVEDB half of a suite's db needs — the shared prep cluster its peers query.
 *         it RESUMES a paused cluster. its pair, `useWakeOfTestdb`, is the LOCAL own-db half: it
 *         only PREFLIGHTS the local testdb (it cannot start it, so it fails loud with a `start:testdb`
 *         fix). the two form a symmetric pair; the name reads "wake" for symmetry, the act differs.
 *         the wake fires for prep OR test access: both reach the deployed prep peers.
 * .note = `reaches` names HOW the caller reaches the cluster, so the gate reads a signal the caller
 *         actually has:
 *         - `via-tunnel` = a node service; gate on `config/prep.json`'s `database.tunnel`
 *         - `via-gateway` = an expo app, which owns no `config/` dir and reaches the cluster through
 *           its gateway's peers; its acceptance + integration suites reach a deployment by
 *           construction, so the test kind itself is the signal and no config gate applies
 */
export const useWakeOfLivedb = async (input: {
  env: 'test' | 'prep' | 'prod' | null;
  reaches: 'via-tunnel' | 'via-gateway';
}): Promise<void> => {
  // decide whether to wake, and which cluster: ci and prod never wake; test + prep wake prep
  const decision = getWakeDecision({
    access: input.env,
    ci: process.env.CI ?? null,
  });
  if (!decision.wake) return;
  const env = decision.access;

  // gate a node service on a declared db tunnel: it is the signal this service reaches the shared
  // cluster, whether it owns the db (persist-with-rds) or only invokes peers that query it (a gateway).
  // absent config = no cluster to wake; a malformed config fails loud (names the file), never silent.
  if (input.reaches === 'via-tunnel' && !asReachesSharedClusterFromConfig({ env }))
    return;

  // the wake blocks suite start on a local run, so its budget is consumer-bounded: a generous
  // default (a cold aurora-serverless-v2 resume can exceed 60s), overridable DOWN via
  // LIVEDB_WAKE_TIMEOUT_MS so a consumer can fail fast on a hung tunnel rather than wait the full cap
  const timeoutMs = Number(process.env.LIVEDB_WAKE_TIMEOUT_MS) || 180000;

  // best-effort wake: a wake-command failure (a non-zero exit, a timeout kill, an absent binary) is
  // non-fatal — a warm db or absent skill must not break the suite. but an error that bears no
  // child-process shape is a malfunction in this module's own logic, so rethrow it (rule.forbid.failhide):
  // the catch tolerates only the allowlisted wake failures and surfaces the rest.
  try {
    wakeSharedCluster({ env, timeoutMs });
  } catch (error) {
    if (!isWakeCommandFailure({ error })) throw error;
    // a non-Error failure shape (e.g. a child-process `{ status, signal }` object) must read
    // legibly on stderr: `String({...})` yields the useless `[object Object]`, so serialize it.
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    warnWakeFailed({ env, message });
  }
};

/**
 * .what = decide whether a run wakes the shared cluster, and which cluster it wakes.
 * .why  = a pure transformer leaf: the prod refusal and the prep default are the two arms a wrong
 *         edit turns into a capacity write against production, so they live in one named, clamped
 *         decision rather than inline in the orchestrator.
 *         - ci → no wake (ci wakes via its own workflow step; the local ssm path is absent there)
 *         - prod → no wake (prod never scales to 0; a wake there is an unprompted prod write)
 *         - test, prep, or undeclared → wake prep, the cluster both test and prep access reach
 *           (both query the deployed prep peers); an undeclared access never falls to prod
 */
export const getWakeDecision = (input: {
  access: 'test' | 'prep' | 'prod' | null;
  ci: string | null;
}): { wake: boolean; access: 'test' | 'prep' | 'prod' } => {
  if (input.access === 'prod') return { wake: false, access: 'prod' };
  if (input.ci) return { wake: false, access: 'prep' };
  return { wake: true, access: 'prep' };
};

/**
 * .what = read the raw text of this service's `config/<env>.json`, or null when absent.
 * .why  = a communicator leaf: the sole filesystem i/o of the wake gate, named so the
 *         orchestrator composes it rather than embeds an inline `existsSync`/`readFileSync`.
 * .note = an absent config is benign (a service that declares none reaches no known cluster),
 *         so absence returns null and the pure decide-step below folds it to false. this leaf
 *         performs i/o only; it never parses or decides.
 */
const readConfigText = (input: {
  env: 'test' | 'prep' | 'prod';
}): string | null => {
  const configPath = join(process.cwd(), 'config', `${input.env}.json`);
  if (!existsSync(configPath)) return null;
  return readFileSync(configPath, 'utf8');
};

/**
 * .what = decide, from raw config text, whether this service reaches the shared cluster.
 * .why  = a pure transformer leaf: no i/o, deterministic. a `database.tunnel` in the config =
 *         a query lands on the cluster (direct or via a peer), so the service reaches it.
 *         the one fact — does this service reach the cluster — has one shape here, read off
 *         the same `database.tunnel` signal everywhere, so two readers cannot drift.
 */
const asReachesSharedClusterFromConfigText = (input: {
  text: string;
}): boolean => {
  return !!JSON.parse(input.text)?.database?.tunnel;
};

/**
 * .what = compose the config read + tunnel decision into a single what-not-how signal.
 * .why  = the composer of the two leaves above, so `useWakeOfLivedb` reads one intent rather than
 *         an inline read-parse-decode a reader must simulate.
 * .note = an absent config folds to false (no known cluster → no wake). but a present-yet-
 *         unparseable config is NOT benign: it means the consumer authored a config the setup
 *         cannot read, so a silent `false` would conflate a broken config with an absent tunnel.
 *         so a parse failure throws a ConstraintError (caller-must-fix, exit 2) that names the
 *         file + the fix, rather than a raw engine SyntaxError with no file and no remediation.
 */
const asReachesSharedClusterFromConfig = (input: {
  env: 'test' | 'prep' | 'prod';
}): boolean => {
  const text = readConfigText({ env: input.env });
  if (text === null) return false; // no config = no known cluster (benign)
  try {
    return asReachesSharedClusterFromConfigText({ text });
  } catch (cause) {
    // allowlist the ONLY error the parse-decide leaf can throw — a SyntaxError on malformed json.
    // an error of any other shape is a malfunction in this module's own logic, not a config the
    // consumer mis-authored, so surface it unwrapped rather than relabel it a parse failure
    // (rule.forbid.failhide: a catch allowlists its expected errors and rethrows the rest).
    if (!(cause instanceof SyntaxError)) throw cause;
    // a config the consumer authored but the setup cannot parse is a real defect, not "no cluster" —
    // throw with the path so a malformed config names the file to repair (never a silent false)
    const configPath = join(process.cwd(), 'config', `${input.env}.json`);
    throw new ConstraintError(
      `useWakeOfLivedb: could not parse ${configPath} as JSON — fix the malformed config so the wake gate can read its database.tunnel signal`,
      { cause },
    );
  }
};

/**
 * .what = wake the shared cluster by an ssm tunnel that resumes it for every consumer.
 * .why  = a communicator leaf: the sole subprocess i/o of the wake, named so the orchestrator
 *         composes it rather than embeds an inline `execSync`. `rhx use.rds.capacity` opens the
 *         tunnel and waits for the cluster to accept connections, which resumes it (incl. for
 *         deployed lambdas), not just the local caller.
 */
const wakeSharedCluster = (input: {
  env: 'test' | 'prep' | 'prod';
  timeoutMs: number;
}): void => {
  execSync(`rhx use.rds.capacity --env ${input.env}`, {
    stdio: 'inherit',
    timeout: input.timeoutMs,
  });
};

/**
 * .what = surface a wake failure loud to stderr, non-fatal.
 * .why  = a communicator leaf: the failure sink of the wake, named so the orchestrator composes
 *         it rather than embeds an inline `process.stderr.write`. a real wake failure — a
 *         miswired command, an absent skill, a broken rhx binary — must be visible, never hidden;
 *         the suite proceeds and a downstream cold-start timeout flake is the likely symptom.
 */
const warnWakeFailed = (input: {
  env: 'test' | 'prep' | 'prod';
  message: string;
}): void => {
  process.stderr.write(
    `useWakeOfLivedb: 'rhx use.rds.capacity --env ${input.env}' failed (non-fatal): ${input.message}\n`,
  );
};

/**
 * .what = decide whether an error is a wake-command failure (safe to tolerate) vs a code malfunction.
 * .why  = a pure transformer leaf: the allowlist `rule.forbid.failhide` demands. an execSync failure
 *         bears a child-process shape — a numeric `status` (a non-zero exit), a string `signal` (a
 *         timeout kill), or a `code` of `ENOENT` (an absent binary) or `ETIMEDOUT` (the cap).
 *         those are the wake failures the suite intends to tolerate. an error with none of that shape
 *         is a genuine malfunction in this module's own logic, so the catch rethrows it, never warns
 *         it away — a best-effort op still distinguishes the failures it ignores from the ones it must not.
 */
const isWakeCommandFailure = (input: { error: unknown }): boolean => {
  const error = input.error;
  if (!error || typeof error !== 'object') return false;
  const shape = error as { status?: unknown; signal?: unknown; code?: unknown };
  if (typeof shape.status === 'number') return true; // child exited non-zero
  if (typeof shape.signal === 'string') return true; // child killed by a signal (a timeout)
  if (shape.code === 'ENOENT' || shape.code === 'ETIMEDOUT') return true; // absent binary, cap hit
  return false; // any other `code` (EACCES, EMFILE, …) is not a wake failure, so it rethrows
};
