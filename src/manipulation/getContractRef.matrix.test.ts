import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { RefByPrimary } from '@src/instantiation/RefByPrimary';
import type { Ref } from '@src/reference/Ref.type';
import type { Refable } from '@src/reference/Refable';
import type { RefByPrimary as RefByPrimaryType } from '@src/reference/RefByPrimary.type';
import type { RefByUnique as RefByUniqueType } from '@src/reference/RefByUnique.type';
import { refByUnique } from '@src/reference/refByUnique';

/**
 * .what = the exhaustive edge matrix for the `.ref` surface — tables **A, B, E, F, G** of the vision
 * .why = `.ref` earns this treatment for three reasons: `.ref()` is now the DEFAULT form, q24
 *   proved the surface can report success while it destroys the key, and `getContractRef` carries
 *   the most branch-dense logic in the repo. per `philosophy.verification-strictness`: every
 *   positive path, every negative path, every edge case — no gaps.
 * .note = tables A and B run the SAME case list against two dobjs that differ by exactly one
 *   call — `.optional()` on the primary key. ⭐ every cell must match. any divergence is q24
 *   back, so the two tables are asserted from one shared list rather than two hand-written copies.
 * .note = tables **C** (key-declaration variants) and **D** (nested unique-key recursion) are NOT
 *   here — `getContractRef.test.ts` already covers them cell for cell, and it predates this work, so
 *   a re-assert here would duplicate rather than cover. the map, for an auditor:
 *   C → its `given` blocks for both-grains / primary-only / unique-only / neither-declared /
 *   key-absent-from-schema / non-object-schema / joi / no-schema / unrecognized-`by`;
 *   D → scalar / nested-dobj-with-unique / nested-DomainLiteral / polymorphic-arm-with-unique /
 *   polymorphic-no-arm-with-unique / self-cyclic / two-hop-cyclic.
 */

// ---- type-level assertion kit ------------------------------------------------------------------
//
// .note = this kit is duplicated in `getContract.coerce.test.ts`, deliberately and per
//   `rule.prefer.wet-over-dry`: at TWO usages the rule prescribes copy-paste plus a note of the
//   duplication, which this is. extract to a shared test asset at the THIRD usage, not before —
//   a premature shared kit would couple two independent clamp suites for three lines of types.

type IsAny<T> = 0 extends 1 & T ? true : false;
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const assertType = <_T extends true>(): void => undefined;

// ---- the two fixtures: identical but for `.optional()` on the primary key -----------------------

interface Board {
  brand: string;
}
class Board extends DomainLiteral<Board> implements Board {
  public static schema = z.object({ brand: z.string() });
}
/** .what = Board's boundary type; `ReturnType<…['ref']>` resolves the last overload, `ref('unique')` */
type BoardContract = ReturnType<typeof Board.contract>;

/** .what = the control: a dobj whose primary key is REQUIRED in its schema (table A) */
interface SurferStrict {
  uuid: string;
  name: string;
  stance: string;
  board: Board;
}
class SurferStrict extends DomainEntity<SurferStrict> implements SurferStrict {
  public static primary = ['uuid'] as const;
  public static unique = ['name'] as const;
  public static nested = { board: Board };
  public static schema = z.object({
    uuid: z.string(),
    name: z.string(),
    stance: z.string(),
    board: Board.contract(),
  });
}

/**
 * .what = the q24 case on the TWIN grain: the same dobj, UNIQUE key `.optional()` — table F′
 * .why = the q24 fix (`.required()` in `pickDeclaredKeys`) is applied by one gate that serves both
 *   grains, so it silently changed `unique` too. that change is correct — a reference names a real
 *   value or it names none, whichever key it is — but it was clamped for `primary` alone, so the
 *   `unique` grain's three surfaces were never asserted to agree.
 * .note = ⚠️ this fixture declares a shape the repo's own rules discourage (`rule.require.immutable-refs`
 *   wants a stable unique key), which is exactly why it belongs in a test rather than a readme
 *   example: the surface must behave correctly on a declaration a consumer can legally write, not
 *   only on the one we would prefer they wrote.
 */
interface SurferLooseUnique {
  uuid: string;
  callsign?: string;
}
class SurferLooseUnique
  extends DomainEntity<SurferLooseUnique>
  implements SurferLooseUnique
{
  public static primary = ['uuid'] as const;
  public static unique = ['callsign'] as const;
  public static schema = z.object({
    uuid: z.string(),
    callsign: z.string().optional(),
  });
}

/** .what = the q24 case: the same dobj, primary key `.optional()` (db-generated) — table B */
interface SurferLoose {
  uuid?: string;
  name: string;
  stance: string;
  board: Board;
}
class SurferLoose extends DomainEntity<SurferLoose> implements SurferLoose {
  public static primary = ['uuid'] as const;
  public static unique = ['name'] as const;
  public static nested = { board: Board };
  public static schema = z.object({
    uuid: z.string().optional(),
    name: z.string(),
    stance: z.string(),
    board: Board.contract(),
  });
}

// ---- tables A + B: payload × grain, asserted from ONE shared list -------------------------------

/** .what = what a grain must do with a payload: yield an exact value, or reject */
type Verdict = { yields: Record<string, any> } | { rejects: true };

const REJECT: Verdict = { rejects: true };

const FULL_PLAIN = {
  uuid: 'surfer-1',
  name: 'kai',
  stance: 'goofy',
  board: { brand: 'Firewire' },
};

const CASES: {
  description: string;
  payload: any;
  expect: { primary: Verdict; unique: Verdict; ref: Verdict };
}[] = [
  {
    description: 'a full plain object',
    payload: FULL_PLAIN,
    expect: {
      primary: { yields: { uuid: 'surfer-1' } },
      unique: { yields: { name: 'kai' } },
      // both keys present → the union takes the PRIMARY arm (declaration order)
      ref: { yields: { uuid: 'surfer-1' } },
    },
  },
  {
    description: 'extras and a nested dobj present (pruned to the key)',
    payload: { ...FULL_PLAIN, sponsor: 'Rip Curl', sessions: [1, 2, 3] },
    expect: {
      primary: { yields: { uuid: 'surfer-1' } },
      unique: { yields: { name: 'kai' } },
      ref: { yields: { uuid: 'surfer-1' } },
    },
  },
  {
    description: 'the primary key only',
    payload: { uuid: 'surfer-1' },
    expect: {
      primary: { yields: { uuid: 'surfer-1' } },
      unique: REJECT,
      ref: { yields: { uuid: 'surfer-1' } },
    },
  },
  {
    description: '⭐ the UNIQUE key only — the fallback, never {}',
    payload: { name: 'kai' },
    expect: {
      primary: REJECT,
      unique: { yields: { name: 'kai' } },
      // ⭐ the q24 cell: the union must FALL BACK to the unique arm, never succeed vacuously
      ref: { yields: { name: 'kai' } },
    },
  },
  {
    description: 'neither key — every grain rejects, never {}',
    payload: { stance: 'goofy' },
    expect: { primary: REJECT, unique: REJECT, ref: REJECT },
  },
  {
    description: 'an empty object',
    payload: {},
    expect: { primary: REJECT, unique: REJECT, ref: REJECT },
  },
  {
    description: 'a key of the wrong type',
    payload: { uuid: 42, name: 42 },
    expect: { primary: REJECT, unique: REJECT, ref: REJECT },
  },
  {
    description: 'a key present, value undefined',
    payload: { uuid: undefined, name: undefined },
    expect: { primary: REJECT, unique: REJECT, ref: REJECT },
  },
  {
    description: 'a key present, value null',
    payload: { uuid: null, name: null },
    expect: { primary: REJECT, unique: REJECT, ref: REJECT },
  },
];

/** .what = asserts one cell of the matrix: one payload against one grain */
const assertCell = (
  schema: z.ZodType<any, any>,
  payload: any,
  verdict: Verdict,
): void => {
  const result = schema.safeParse(payload);
  if ('rejects' in verdict) {
    expect(result.success).toEqual(false);
    // ⭐ a rejection must be a REAL zod error, never a silent `{}` reported as success
    expect(result.error!.issues.length).toBeGreaterThan(0);
    return;
  }
  expect(result.success).toEqual(true);
  expect(result.data).toEqual(verdict.yields);
  // and never a reference to nowhere
  expect(Object.keys(result.data as object).length).toBeGreaterThan(0);
};

describe('getContractRef matrix (exhaustive edge coverage)', () => {
  // tables A and B — the SAME case list, run against a required-primary dobj and an
  // optional-primary one. ⭐ every cell must match; a divergence is q24 back.
  //
  // table B IS clamp c21: on an optional-primary dobj, `.ref()` on a unique-only payload must yield
  // `{ name }` (the fallback), `.ref('primary')` must reject `{}`, and a payload that satisfies
  // neither grain must raise a real zod error rather than report `{}` as a success. those three
  // cells are rows of CASES, and `assertCell` enforces the never-`{}` half for every row at once.
  for (const [table, Dobj] of [
    ['A · primary key REQUIRED', SurferStrict],
    ['B · primary key OPTIONAL (the q24 case) — c21', SurferLoose],
  ] as const) {
    given(`${table}`, () => {
      for (const testCase of CASES) {
        when(`the payload is ${testCase.description}`, () => {
          then("c20/c21 — .ref('primary') behaves as the table says", () => {
            assertCell(
              Dobj.contract().ref('primary'),
              testCase.payload,
              testCase.expect.primary,
            );
          });

          then("c20/c21 — .ref('unique') behaves as the table says", () => {
            assertCell(
              Dobj.contract().ref('unique'),
              testCase.payload,
              testCase.expect.unique,
            );
          });

          then('c20/c21 — .ref() behaves as the table says', () => {
            assertCell(
              Dobj.contract().ref(),
              testCase.payload,
              testCase.expect.ref,
            );
          });
        });
      }

      // ⭐ c20: a FULL INSTANCE at a ref position must prune, natively, with no error
      when('the payload is a full live INSTANCE of the dobj', () => {
        const instance = new Dobj(FULL_PLAIN as any);

        then('c20 — .ref(primary) prunes it to the primary key alone', () => {
          const pruned = Dobj.contract().ref('primary').parse(instance);
          expect(pruned).toEqual({ uuid: 'surfer-1' });
        });

        then('c20 — .ref(unique) prunes it to the unique key alone', () => {
          const pruned = Dobj.contract().ref('unique').parse(instance);
          expect(pruned).toEqual({ name: 'kai' });
        });

        then('c20 — .ref() takes the PRIMARY arm when both keys exist', () => {
          const pruned = Dobj.contract().ref().parse(instance);
          expect(pruned).toEqual({ uuid: 'surfer-1' });
        });

        then(
          'c20 — the pruned value is a PLAIN object, not the instance',
          () => {
            const pruned = Dobj.contract().ref('primary').parse(instance);
            expect(pruned).not.toBeInstanceOf(Dobj);
            expect(pruned).not.toBe(instance);
            // and the source instance is untouched by the prune
            expect(instance.name).toEqual('kai');
          },
        );
      });
    });
  }

  // ---- F · the three-surface agreement (c22) ----------------------------------------------------

  given('F · the three surfaces that describe the same reference', () => {
    // ⭐ what the SCHEMA accepts must equal what the TYPE says and what the CTOR admits.
    // q24 was exactly a break of this: `pick` inherited optionality, so the schema alone drifted.
    const surfaces = [
      ['a required-primary dobj', SurferStrict],
      ['an optional-primary dobj', SurferLoose],
    ] as const;

    for (const [description, Dobj] of surfaces) {
      when(description, () => {
        then('c22 — all three ACCEPT a payload that names the key', () => {
          const payload = { uuid: 'surfer-1' };
          // the schema
          expect(
            Dobj.contract().ref('primary').safeParse(payload).success,
          ).toEqual(true);
          // the ctor
          expect(
            () => new RefByPrimary<typeof Dobj>(payload as any),
          ).not.toThrow();
        });

        then('c22 — all three REJECT an undefined key value', () => {
          const payload = { uuid: undefined };
          // the schema
          expect(
            Dobj.contract().ref('primary').safeParse(payload).success,
          ).toEqual(false);
          // the ctor
          expect(() => new RefByPrimary<typeof Dobj>(payload as any)).toThrow();
        });

        then(
          'c22 — ⚠️ an ABSENT key: the schema rejects, the ctor cannot',
          () => {
            const payload = {};

            // the schema rejects — it reads `static primary`, so it KNOWS which key must be named
            expect(
              Dobj.contract().ref('primary').safeParse(payload).success,
            ).toEqual(false);

            // ⚠️ MEASURED, and recorded rather than asserted away (`rule.forbid.failhide`): the ctor
            // does NOT reject. it walks `Object.keys(props)` and rejects an `undefined` VALUE, but an
            // empty object has no key to walk — and the ctor is generic, so the dobj's `primary` key
            // NAMES are erased by the time it runs. it cannot know what is absent.
            //
            // so the three surfaces agree on every cell except this one, and the asymmetry is
            // structural rather than an oversight. the SCHEMA is the surface that can carry this
            // guarantee, which is exactly why the q24 fix belongs there.
            expect(
              () => new RefByPrimary<typeof Dobj>(payload as any),
            ).not.toThrow();
            expect({
              ...new RefByPrimary<typeof Dobj>(payload as any),
            }).toEqual({});
          },
        );

        then('c22 — the TYPE marks the key required, either way', () => {
          // `RefByPrimary<X>` is `Required<Pick<…>>`, so the key is required even when the source
          // schema declares it `.optional()`. this is the surface the other two must match.
          type T = RefByPrimaryType<typeof Dobj>;
          assertType<Equals<T, { uuid: string }>>();
          // the runtime witness that the SCHEMA now matches that type: it rejects the empty
          // object the ctor cannot catch, which is the whole point of the q24 fix
          expect(Dobj.contract().ref('primary').safeParse({}).success).toEqual(
            false,
          );
        });
      });
    }
  });

  // ---- F′ · the SAME agreement, on the twin grain (c22) ------------------------------------------

  given(
    'F′ · the three surfaces, for a dobj whose UNIQUE key is optional',
    () => {
      // ⭐ the q24 fix is applied by ONE gate that serves both grains, so it changed `unique` too —
      // correctly, but silently. this table is the twin of F: the same three surfaces, same cells,
      // asserted for `unique` so a grain-scoped regression cannot pass while the other grain stays green.
      // ⚠️ before this, the three surfaces DISAGREED here: the type was a bare `Pick` (optionality
      // inherited), the ctor assigned `undefined` without complaint, and only the schema demanded the
      // key. they were aligned toward the STRICT side, since the lenient one is the failhide.

      // ⚠️ `refByUnique` reads `instance.constructor.unique`, so it must be handed a real INSTANCE.
      // a plain literal has `Object` as its constructor and trips the "does not declare .unique"
      // guard instead — which is a throw for the wrong reason, and would have made the reject-cell
      // below pass while it proved none of the claim. measured: the first draft of this table did
      // exactly that, and the suite caught it (`philosophy.verification-strictness`).

      then('c22 — all three ACCEPT a payload that names the key', () => {
        const payload = { uuid: 'surfer-1', callsign: 'crush' };
        // the schema
        expect(
          SurferLooseUnique.contract().ref('unique').safeParse(payload).success,
        ).toEqual(true);
        // the ctor
        const instance = new SurferLooseUnique(payload);
        expect(refByUnique<typeof SurferLooseUnique>(instance as any)).toEqual({
          callsign: 'crush',
        });
      });

      then('c22 — all three REJECT an undefined key value', () => {
        const payload = { uuid: 'surfer-1', callsign: undefined };
        // the schema
        expect(
          SurferLooseUnique.contract().ref('unique').safeParse(payload).success,
        ).toEqual(false);
        // the ctor — ⭐ this is the surface that used to assign `undefined` and return silently.
        // asserted on the MESSAGE, so a throw for any other reason (e.g. the `.unique`-absent
        // guard) cannot be mistaken for this one
        const instance = new SurferLooseUnique(payload);
        expect(() =>
          refByUnique<typeof SurferLooseUnique>(instance as any),
        ).toThrow("unique key 'callsign' is undefined");
      });

      then('c22 — the TYPE marks the unique key required too', () => {
        // ⭐ `RefByUnique<X>` is now `Required<Pick<…>>`, the mirror of `RefByPrimary`. the negative
        // control is that `{ callsign?: string }` would NOT satisfy this, so a regression to a bare
        // `Pick` turns the assertion red rather than merely loosening it unseen.
        type T = RefByUniqueType<typeof SurferLooseUnique>;
        assertType<Equals<T, { callsign: string }>>();
      });

      then(
        'c22 — ⭐ and .ref() falls back to unique rather than to `{}`',
        () => {
          // the union tries primary first; a payload that names only the unique key must reach the
          // unique arm and keep the key — the exact failure q24 named, now asserted on this fixture too
          const parsed = SurferLooseUnique.contract()
            .ref()
            .parse({ callsign: 'crush' });
          expect(parsed).toEqual({ callsign: 'crush' });
        },
      );
    },
  );

  // ---- E · types, each with a consumed negative control ------------------------------------------

  given('E · the types each ref grain infers', () => {
    when('a narrow grain is inferred', () => {
      then('c4 — .ref(primary) is RefByPrimary<X>, never any', () => {
        const ref = SurferStrict.contract()
          .ref('primary')
          .parse({ uuid: 'surfer-1' });
        // it does not erase to `any` …
        assertType<Equals<IsAny<typeof ref>, false>>();
        // … and it is EXACTLY the published ref type, not merely some non-any type
        assertType<Equals<typeof ref, RefByPrimaryType<typeof SurferStrict>>>();
        expect(ref.uuid).toEqual('surfer-1');
      });

      then('c4 — .ref(primary) REJECTS the unique key at compile', () => {
        const ref = SurferStrict.contract().ref('primary').parse({
          uuid: 'surfer-1',
        });
        // @ts-expect-error - `name` is the unique key; a primary ref does not carry it
        expect(ref.name).toBeUndefined();
      });

      then(
        'c4 — .ref(unique) is RefByUnique<X>, and rejects the primary key',
        () => {
          const ref: RefByUniqueType<typeof SurferStrict> =
            SurferStrict.contract().ref('unique').parse({ name: 'kai' });
          expect(ref.name).toEqual('kai');
          // @ts-expect-error - `uuid` is the primary key; a unique ref does not carry it
          expect(ref.uuid).toBeUndefined();
        },
      );
    });

    when('the union grain is inferred', () => {
      then('c5 — .ref() is Ref<X>: BOTH narrow shapes are assignable', () => {
        const byPrimary: Ref<typeof SurferStrict> = { uuid: 'surfer-1' };
        const byUnique: Ref<typeof SurferStrict> = { name: 'kai' };
        expect(byPrimary).toBeDefined();
        expect(byUnique).toBeDefined();
      });

      then('c5 — the union is NOT assignable to a narrow ref', () => {
        const union = SurferStrict.contract().ref().parse({ uuid: 'surfer-1' });
        // @ts-expect-error - a union ref may be either grain; it does not narrow on its own
        const narrow: RefByPrimaryType<typeof SurferStrict> = union;
        expect(narrow).toBeDefined();
      });

      then('c5 — at RUNTIME, neither narrow form accepts the other key', () => {
        expect(
          SurferStrict.contract().ref('primary').safeParse({ name: 'kai' })
            .success,
        ).toEqual(false);
        expect(
          SurferStrict.contract().ref('unique').safeParse({ uuid: 'surfer-1' })
            .success,
        ).toEqual(false);
      });
    });

    when('a keyless DomainLiteral asks for a ref', () => {
      then('E — it still COMPILES; the degrade is a recorded limit', () => {
        // ⚠️ a keyless `DomainLiteral` declares neither `static primary` nor `static unique`, so
        // `Refable` is unsatisfied and the ref-shaped types degrade to a loose type rather than a
        // compile error. asserted explicitly so the degrade is a KNOWN limit, not a surprise.
        //
        // both halves of that sentence are clamped at the type level, since a prose claim about a
        // type is worth exactly as much as the assertion behind it:
        //   1. the CAUSE — `Refable` demands the two key statics by PRESENCE, so an `any` type
        //      argument cannot excuse their absence; a keyless class fails the constraint outright
        assertType<
          Equals<
            typeof Board extends Refable<any, any, any> ? true : false,
            false
          >
        >();
        //   2. the EFFECT — so every ref-shaped member falls to the loose arm of the conditional
        assertType<IsAny<z.infer<ReturnType<BoardContract['ref']>>>>();

        const contract = Board.contract();
        expect(contract).toBeDefined();
        // and the runtime still fails loud — the degrade is at the type level only
        expect(() => contract.ref()).toThrow();
      });
    });
  });

  // ---- G · emit + identity -----------------------------------------------------------------------

  given('G · the pragma each grain stamps, and its identity', () => {
    const emit = (schema: z.ZodType<any, any>): Record<string, any> =>
      z.toJSONSchema(schema, { io: 'input' });

    when('each grain is emitted', () => {
      then('G — each stamps x-domain-object-ref with its own `by`', () => {
        expect(
          emit(SurferStrict.contract().ref('primary'))['x-domain-object-ref'],
        ).toEqual({ of: 'SurferStrict', by: 'primary' });
        expect(
          emit(SurferStrict.contract().ref('unique'))['x-domain-object-ref'],
        ).toEqual({ of: 'SurferStrict', by: 'unique' });
      });

      then(
        "G — ⭐ .ref() still stamps by: 'ref' (f11 removed the ARGUMENT, not the value)",
        () => {
          expect(
            emit(SurferStrict.contract().ref())['x-domain-object-ref'],
          ).toEqual({ of: 'SurferStrict', by: 'ref' });
        },
      );

      then(
        'G — the emitted key is marked required, so the wire says so',
        () => {
          // the q24 fix reaching the wire: an optional-primary dobj still publishes `required`
          expect(emit(SurferLoose.contract().ref('primary')).required).toEqual([
            'uuid',
          ]);
          expect(emit(SurferStrict.contract().ref('primary')).required).toEqual(
            ['uuid'],
          );
        },
      );

      then(
        'G — a ref emits under the DEFAULT io too (it carries no coerce)',
        () => {
          // the one form with no emit constraint: a ref is a plain pick, so both faces represent.
          // this is why an sdk can hold ONE unconditional `{ io: 'input' }` rule without a per-node
          // judgment — the flag is merely redundant here, never wrong.
          expect(() =>
            z.toJSONSchema(SurferStrict.contract().ref('primary')),
          ).not.toThrow();
        },
      );

      then('G — the pragma survives a wrapper AND an array item', () => {
        const wrapper = z.object({
          one: SurferStrict.contract().ref('primary'),
          many: z.array(SurferStrict.contract().ref('unique')),
        });
        const json = emit(wrapper);
        expect(json.properties.one['x-domain-object-ref']).toEqual({
          of: 'SurferStrict',
          by: 'primary',
        });
        expect(json.properties.many.items['x-domain-object-ref']).toEqual({
          of: 'SurferStrict',
          by: 'unique',
        });
        expect(json).toMatchSnapshot();
      });
    });

    when('the same grain is asked for twice', () => {
      then('G — memoized per class AND per by', () => {
        expect(SurferStrict.contract().ref('primary')).toBe(
          SurferStrict.contract().ref('primary'),
        );
        expect(SurferStrict.contract().ref('unique')).toBe(
          SurferStrict.contract().ref('unique'),
        );
        expect(SurferStrict.contract().ref()).toBe(
          SurferStrict.contract().ref(),
        );
        // and each grain is a DISTINCT instance from the others
        expect(SurferStrict.contract().ref('primary')).not.toBe(
          SurferStrict.contract().ref('unique'),
        );
        // and two distinct classes never share a memo
        expect(SurferStrict.contract().ref('primary')).not.toBe(
          SurferLoose.contract().ref('primary'),
        );
      });
    });
  });
});
