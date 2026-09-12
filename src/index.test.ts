import { given, then, when } from 'test-fns';

import * as domainObjects from '@src/index';

/**
 * .what = the clamp on this package's PUBLIC SURFACE — the export inventory of `src/index.ts`
 * .why =
 *   - a snapshot makes an addition **visible for review** and a removal **loud**. the barrel is this
 *     package's contract with every consumer, and it had no clamp: an export could be dropped by a
 *     bad merge or a refactor and no gate would notice until a consumer's build broke.
 *   - the behavior that added this test also **broke** the public surface on purpose (the bare
 *     `.contract` schema form was removed). a surface worth a deliberate break is a surface worth a
 *     clamp, so the next break is deliberate too rather than accidental.
 * .note = ⚠️ **this is a UNIT clamp, deliberately**, though the barrel is a contract grain and
 *   `rule.require.test-coverage-by-grain` puts a contract at acceptance + snapshot. an earlier
 *   version of this note cited that rule while the file ran as a unit test — a grain claim its own
 *   filename contradicted. the grain choice is right and the claim was the defect, so the claim is
 *   withdrawn and the reason recorded instead:
 *     - what is clamped here is a **static fact about a module** (which names it exports), not a
 *       journey across a boundary. there is no request to make, so an acceptance journey would add
 *       ceremony and no signal
 *     - the acceptance suite needs a keyrack unlock, so a barrel clamp placed there would stop to
 *       guard on every run without credentials — strictly less protection for a strictly higher cost
 *   the rule's *spirit* — a contract change must be visible in a pr diff — is met by the snapshot,
 *   which is the half that does that work. the journey half is carried by the two
 *   `*.roundtrip.acceptance.test.ts` suites, which reach the deliverable through this same barrel.
 * .note = ⚠️ this sees VALUE exports only. `export type { … }` is erased at runtime, so the type
 *   half of the barrel cannot appear here. those are clamped instead by the test files that import
 *   them **from `@src/index`** (rather than from their source file) — a removed type export breaks
 *   `tsc` there. keep that habit: import a public type from the barrel in at least one test.
 * .note = an intentional surface change SHOULD update this snapshot. the snapshot is not a veto —
 *   it is the diff line that makes a reviewer look.
 */
describe('index (the public surface)', () => {
  given('the package barrel', () => {
    when('its value exports are enumerated', () => {
      then('the inventory matches the snapshot', () => {
        const exported = Object.keys(domainObjects).sort();
        expect(exported).toMatchSnapshot();
      });

      then('the core exports are each present', () => {
        // the explicit half, beside the snapshot: `rule.forbid.failhide` warns that a snapshot
        // ALONE is fake verification, since a wrong value is as snapshottable as a right one.
        // these are the exports a consumer cannot build a domain object without.
        const exported = Object.keys(domainObjects);
        expect(exported).toContain('DomainObject');
        expect(exported).toContain('DomainEntity');
        expect(exported).toContain('DomainLiteral');
        expect(exported).toContain('DomainEvent');
        expect(exported).toContain('serialize');
        expect(exported).toContain('deserialize');
      });

      then('every exported name resolves to a defined value', () => {
        // catches the half a name-only assertion misses: an export that survives as a name but
        // resolves to `undefined` (a circular-import casualty, which this repo guards with dpdm
        // precisely because it has been bitten before)
        const undefinedExports = Object.entries(domainObjects)
          .filter(([, value]) => value === undefined)
          .map(([name]) => name);
        expect(undefinedExports).toEqual([]);
      });
    });
  });
});
