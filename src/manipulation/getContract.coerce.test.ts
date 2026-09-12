import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainEvent } from '@src/instantiation/DomainEvent';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import type { WithImmute } from '@src/manipulation/immute/withImmute';

/**
 * .what = the clamps for the coerce boundary: `X.contract()` parses wire props INTO a live dobj
 * .why = per `rule.require.clamp-edge-cases`, every guarantee ships with a regression clamp, and the
 *   clamp must BITE. most of this surface is invisible to an ordinary test — a type that silently
 *   widens back to `any`, a removed form that must stay removed, a pragma that rides an emit — so
 *   each type clamp below carries a negative control that fails if the guarantee is lost.
 */

// ---- type-level assertion kit ------------------------------------------------------------------
//
// .note = this kit is duplicated in `getContractRef.matrix.test.ts`, deliberately and per
//   `rule.prefer.wet-over-dry`: at TWO usages the rule prescribes copy-paste plus a note of the
//   duplication, which this is. extract to a shared test asset at the THIRD usage, not before —
//   a premature shared kit would couple two independent clamp suites for three lines of types.

/** .what = true only when T is `any` (the widen this whole surface exists to prevent) */
type IsAny<T> = 0 extends 1 & T ? true : false;

/** .what = exact type equality (invariant, so it catches a widen a naive `extends` would pass) */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/**
 * .what = compile-time assertion; a `false` argument is a type error
 * .why = the assertion IS the clamp — it goes red at `tsc`, before any test runs
 */
const assertType = <_T extends true>(): void => undefined;

// ---- the fixture -------------------------------------------------------------------------------

interface Surfboard {
  brand: string;
  length: number;
}
class Surfboard extends DomainLiteral<Surfboard> implements Surfboard {
  public static schema = z.object({ brand: z.string(), length: z.number() });
}

interface Surfer {
  uuid?: string;
  name: string;
  board: Surfboard;
  boards: Surfboard[];
  sponsor: Surfboard | null;
}
class Surfer extends DomainEntity<Surfer> implements Surfer {
  public static primary = ['uuid'] as const;
  public static unique = ['name'] as const;
  public static nested = {
    board: Surfboard,
    boards: Surfboard,
    sponsor: Surfboard,
  };
  public static schema = z.object({
    uuid: z.string().optional(),
    name: z.string(),
    board: Surfboard.contract(),
    boards: z.array(Surfboard.contract()),
    sponsor: Surfboard.contract().nullable(),
  });
}

const wireSurfer = {
  uuid: 'surfer-1',
  name: 'kai',
  board: { brand: 'Firewire', length: 68 },
  boards: [
    { brand: 'Channel Islands', length: 61 },
    { brand: 'Lost', length: 59 },
  ],
  sponsor: null,
};

/**
 * .what = a THIRD level of nest — `Team → Surfer → Surfboard`
 * .why = the vision's c16 asks for a **three-level** nest, all the way down. the `Surfer` fixture
 *   alone is two (root + one nested level), so a recursion that stopped at depth 2 would satisfy
 *   it. this wraps the extant fixtures rather than deepens them, so every other clamp in this file
 *   keeps the payload it was written against.
 */
interface Team {
  uuid?: string;
  name: string;
  captain: Surfer;
}
class Team extends DomainEntity<Team> implements Team {
  public static primary = ['uuid'] as const;
  public static unique = ['name'] as const;
  public static nested = { captain: Surfer };
  public static schema = z.object({
    uuid: z.string().optional(),
    name: z.string(),
    captain: Surfer.contract(),
  });
}

const wireTeam = { uuid: 'team-1', name: 'north shore', captain: wireSurfer };

describe('getContract coerce (the boundary clamps)', () => {
  given('a dobj whose contract sits at a position in a parent contract', () => {
    const endpoint = z.object({ surfer: Surfer.contract() });

    when('the position is read at the type level', () => {
      then('c1 — it does NOT erase to any', () => {
        type Parsed = z.infer<typeof endpoint>['surfer'];
        assertType<Equals<IsAny<Parsed>, false>>();
        // the negative control: `any` at this position would make BOTH of these pass, so the
        // pair is what proves the clamp bites rather than merely compiles
        assertType<Equals<IsAny<any>, true>>();
        // the runtime witness of the same claim: a position typed `any` would carry no coerce,
        // so a parse would hand back a plain bag rather than the class
        expect(endpoint.parse({ surfer: wireSurfer }).surfer).toBeInstanceOf(
          Surfer,
        );
      });

      then('c2 — it names the class, wrapped in WithImmute', () => {
        type Parsed = z.infer<typeof endpoint>['surfer'];
        assertType<Equals<Parsed, WithImmute<Surfer>>>();
        // negative control: a bare Surfer (no `.clone`) is NOT the inferred type
        assertType<Equals<Equals<Parsed, Surfer>, false>>();
        // the runtime witness: `WithImmute` is exactly the `.clone` the type claims
        expect(typeof endpoint.parse({ surfer: wireSurfer }).surfer.clone).toBe(
          'function',
        );
      });

      then('c1 — and it REJECTS an unrelated shape at compile', () => {
        // the wish's own negative control, and the half c1/c2 alone do not prove: "not `any`" and
        // "names the class" are both satisfiable by a type that still admits garbage. this is the
        // assertion that the type actually carries weight. it also self-checks: were the position
        // ever to widen, the directive would go UNUSED and `tsc` would fail with TS2578 — so this
        // clamp cannot silently rot the way a runtime-only one could.
        const rejectsGarbage: z.infer<typeof endpoint> = {
          // @ts-expect-error — an unrelated shape must not satisfy the coerced position
          surfer: { totally: 'unrelated' },
        };

        // the runtime witness of the same claim (s2f): the compile refusal and the parse refusal
        // are two faces of one guarantee, so they are asserted together and fail together. a
        // `toBeDefined()` here would have been the placeholder that s2f exists to forbid.
        const result = endpoint.safeParse(rejectsGarbage);
        expect(result.success).toEqual(false);
        expect(result.error!.issues.length).toBeGreaterThan(0);
      });

      then('c3 — the INPUT side still accepts plain wire json', () => {
        // a bare object literal, typed as the input face: if the input face ever hardens to the
        // class, this stops to compile — the exact regression that would break every caller
        const wire: z.input<typeof endpoint> = { surfer: wireSurfer };
        expect(wire.surfer.name).toEqual('kai');
      });
    });

    when('a wire payload is parsed', () => {
      then('c13 — ONE declaration serves both concerns', () => {
        // concern 1, instantiation: the same schema object hands back a live instance
        const parsed = endpoint.parse({ surfer: wireSurfer });
        expect(parsed.surfer).toBeInstanceOf(Surfer);

        // concern 2, introspection: the SAME schema object emits the plain wire shape + pragma
        const emitted: Record<string, any> = z.toJSONSchema(endpoint, {
          io: 'input',
        });
        expect(emitted.properties.surfer.type).toEqual('object');
        expect(emitted.properties.surfer['x-domain-object'].name).toEqual(
          'Surfer',
        );
      });
    });
  });

  given('a dobj whose schema carries a .default()', () => {
    // ⭐⭐ the vision measured this edge (g41b) and required that *"the exception stays documented
    // rather than rediscovered"* — as clamp **c14**, framed around `z.encode`'s round trip. when f9
    // shipped a `.transform()` instead, c14 was struck as unreachable, which was right. but the
    // EDGE did not go away with the api that exposed it: `.default()` still makes a decode yield
    // more than the wire carried, and the guarantee that now bears the load is **c15**, decode
    // idempotence — which no fixture exercised with a defaulted field.
    // ⚠️ so this is a clamp that went missing in a REFRAME rather than in a decision: the strike
    // note recorded which api died, and not which edge case it had been covering.
    interface Leash {
      lengthInFeet: number;
      color: string;
    }
    class Leash extends DomainLiteral<Leash> implements Leash {
      public static schema = z.object({
        lengthInFeet: z.number(),
        color: z.string().default('clear'),
      });
    }

    when('the wire OMITS the defaulted field', () => {
      const parsed = Leash.contract().parse({ lengthInFeet: 6 });

      then('the decode is a stable SUPERSET of the wire', () => {
        // more comes out than went in — by design, and the reason the round trip is a superset
        // rather than an identity. named here so the next reader meets it as a documented property
        expect(parsed).toBeInstanceOf(Leash);
        expect(parsed.color).toEqual('clear');
        expect(parsed.lengthInFeet).toEqual(6);
      });

      then('c15 — a re-parse of the hydrated value is still IDEMPOTENT', () => {
        // ⭐ the load-bearing half. c15 is what makes ONE declaration safe at an output border, and
        // a default is the shape most likely to break it: were the default re-applied over a real
        // value, a second pass would overwrite it and the output border would corrupt on re-parse.
        const reparsed = Leash.contract().parse(parsed);
        expect(reparsed.color).toEqual('clear');
        expect(JSON.parse(JSON.stringify(reparsed))).toEqual(
          JSON.parse(JSON.stringify(parsed)),
        );
      });
    });

    when('the wire SUPPLIES the defaulted field', () => {
      then('the supplied value wins, and survives a re-parse', () => {
        // the negative control for the clamp above: if the default silently won here, the
        // idempotence assertion would pass while the surface quietly discarded caller data
        const parsed = Leash.contract().parse({
          lengthInFeet: 6,
          color: 'seafoam',
        });
        expect(parsed.color).toEqual('seafoam');
        expect(Leash.contract().parse(parsed).color).toEqual('seafoam');
      });
    });
  });

  given('a wire payload with nested dobjs, arrays, and a null', () => {
    when('the contract parses it', () => {
      const parsed = Surfer.contract().parse(wireSurfer);

      then('c16 — hydration reaches every level, not just depth 1', () => {
        expect(parsed).toBeInstanceOf(Surfer);
        expect(parsed.board).toBeInstanceOf(Surfboard);
        expect(parsed.boards[0]).toBeInstanceOf(Surfboard);
      });

      then('c16 — ⭐ and it reaches THREE levels, all the way down', () => {
        // the vision's c16 says "assert a **three-level** nest, all the way down". the assertion
        // above is only two (root + one nested level), so a recursion that stopped at depth 2
        // would pass it. this walks Team → Surfer → Surfboard, where the leaf is two hops from
        // the root, so a stop at ANY level goes red.
        const parsedTeam = Team.contract().parse(wireTeam);
        expect(parsedTeam).toBeInstanceOf(Team); // level 1
        expect(parsedTeam.captain).toBeInstanceOf(Surfer); // level 2
        expect(parsedTeam.captain.board).toBeInstanceOf(Surfboard); // level 3 ⭐
        // and the leaf inside an ARRAY two hops down, which is the path most likely to be lost
        expect(parsedTeam.captain.boards[0]).toBeInstanceOf(Surfboard);
        // the leaf is genuinely built, not merely shaped — it carries .clone like every level.
        // ⚠️ by property name, since only the ROOT's declared type is `WithImmute<X>`: a nested
        // field's type comes from the author's own interface, which this lib cannot rewrite
        expect(parsedTeam.captain.board).toHaveProperty('clone');
      });

      then('c17 — null stays null; every array element is an instance', () => {
        expect(parsed.sponsor).toEqual(null);
        expect(parsed.boards).toHaveLength(2);
        for (const board of parsed.boards)
          expect(board).toBeInstanceOf(Surfboard);
      });

      then('the root carries .clone (built, not merely constructed)', () => {
        expect(typeof parsed.clone).toEqual('function');
        expect(parsed.clone({ name: 'duke' }).name).toEqual('duke');
        // the clone is a derive, never a mutate — the original is untouched
        expect(parsed.name).toEqual('kai');
      });

      then('c15 — decode is idempotent', () => {
        // the guarantee that makes `.parse` at BOTH borders safe (the convention a framework that
        // parses its own responses relies on). a re-parse of an already-rich value must converge.
        const reparsed = Surfer.contract().parse(parsed);
        expect({ ...reparsed }).toEqual({ ...parsed });
        expect(reparsed).toBeInstanceOf(Surfer);
        expect(reparsed.board).toBeInstanceOf(Surfboard);
      });

      then('the rich form is wire-equivalent (same bytes)', () => {
        // the second condition idempotent-decode leans on: an added method is a function, and
        // JSON.stringify skips functions — so the instance and the wire serialize identically
        expect(JSON.parse(JSON.stringify(parsed))).toEqual(wireSurfer);
      });
    });
  });

  given('a DomainEvent at a boundary position', () => {
    // ⭐ the fourth dobj kind, and the only one never walked through the coerce boundary. the extant
    // `DomainEvent` case (`getContract.test.ts`) asserts the PRAGMA and stops — it never parses. so
    // of entity / literal / event / object, `event` alone had no proof it hydrates, re-parses
    // idempotently (c15), or contains a nested ctor failure (c9). an event is also the kind most
    // likely to arrive at exactly this position, since an event IS a wire payload by nature.

    interface Buoy {
      stationId: string;
    }
    class Buoy extends DomainLiteral<Buoy> implements Buoy {
      public static schema = z.object({ stationId: z.string() });
    }

    interface WaveObserved {
      buoy: Buoy;
      heightInFeet: number;
      occurredAt: string;
    }
    class WaveObserved
      extends DomainEvent<WaveObserved>
      implements WaveObserved
    {
      public static unique = ['occurredAt'] as const;
      public static nested = { buoy: Buoy };
      public static schema = z.object({
        buoy: Buoy.contract(),
        heightInFeet: z.number(),
        occurredAt: z.string(),
      });
      constructor(props: WaveObserved) {
        super(props);
        // the schema admits any number; the domain admits only a plausible observation
        if (props.heightInFeet > 100)
          throw new Error('a 100ft observation is a sensor fault, not a wave');
      }
    }

    const wireObserved = {
      buoy: { stationId: '51201' },
      heightInFeet: 6,
      occurredAt: '2026-08-12T04:20:00Z',
    };

    when('the event crosses a boundary', () => {
      const stream = z.object({ observed: WaveObserved.contract() });
      const parsed = stream.parse({ observed: wireObserved });

      then('it hydrates into a live event, nested dobjs and all', () => {
        expect(parsed.observed).toBeInstanceOf(WaveObserved);
        expect(parsed.observed.buoy).toBeInstanceOf(Buoy);
        expect(typeof parsed.observed.clone).toEqual('function');
      });

      then('c15 — a re-parse of the hydrated value is idempotent', () => {
        // what makes ONE declaration safe at an output border: a decode of an already-rich value
        // converges rather than corrupts
        const reparsed = stream.parse(parsed);
        expect(reparsed.observed).toBeInstanceOf(WaveObserved);
        expect(reparsed.observed.buoy).toBeInstanceOf(Buoy);
        expect(JSON.parse(JSON.stringify(reparsed))).toEqual(
          JSON.parse(JSON.stringify(parsed)),
        );
      });

      then('c12 — the pragma still reads kind = event on the wire face', () => {
        const emitted = z.toJSONSchema(stream, { io: 'input' }) as Record<
          string,
          any
        >;
        expect(emitted.properties.observed['x-domain-object'].kind).toEqual(
          'event',
        );
      });
    });

    when('the event carries a payload its constructor rejects', () => {
      const stream = z.object({ observed: WaveObserved.contract() });
      const result = stream.safeParse({
        observed: { ...wireObserved, heightInFeet: 900 },
      });

      then('c9 — the throw is contained for this kind too', () => {
        expect(result.success).toEqual(false);
        expect(result.error!.issues[0]!.path).toEqual(['observed']);
        expect(result.error!.issues[0]!.message).toContain('WaveObserved');
      });
    });
  });

  given('a caller who awaits the parse', () => {
    // ⭐⭐ the one claim in this whole feature that was REASONED and never MEASURED. the vision's
    // groundwork records it as settled — *"q14: does the position work under `safeParseAsync`? yes
    // — the decode is sync, and zod returns a sync result unchanged"* — while every other claim
    // here was held to a measured bar, and the vision's own §8 names that exact lapse five times
    // over. a grep of `src/` for `parseAsync` matched zero files, so the shipped suite never closed
    // it. it is also the likeliest form the target consumer writes: an sdk handler awaits.
    const endpoint = z.object({ surfer: Surfer.contract() });

    when('the boundary is awaited on a good payload', () => {
      then('parseAsync hydrates exactly as parse does', async () => {
        const event = await endpoint.parseAsync({ surfer: wireSurfer });
        expect(event.surfer).toBeInstanceOf(Surfer);
        expect(event.surfer.board).toBeInstanceOf(Surfboard);
        expect(typeof event.surfer.clone).toEqual('function');
      });

      then('safeParseAsync yields the same instance', async () => {
        const result = await endpoint.safeParseAsync({ surfer: wireSurfer });
        expect(result.success).toEqual(true);
        expect(result.data!.surfer).toBeInstanceOf(Surfer);
      });
    });

    when('the boundary is awaited on a payload it cannot accept', () => {
      then('a schema miss RESOLVES as a failure, never rejects', async () => {
        // the shape a handler branches on — `if (!result.success)`. were the awaited form to reject
        // instead, that branch would be skipped and the failure would escape as an unhandled
        // rejection: the same failhide c9 guards on the sync path, one api over.
        const result = await endpoint.safeParseAsync({ surfer: { name: 42 } });
        expect(result.success).toEqual(false);
        expect(result.error!.issues.length).toBeGreaterThan(0);
      });
    });
  });

  given('a dobj whose constructor rejects what its schema accepts', () => {
    interface Wave {
      height: number;
    }
    class Wave extends DomainEntity<Wave> implements Wave {
      public static primary = ['height'] as const;
      public static unique = ['height'] as const;
      public static schema = z.object({ height: z.number() });
      constructor(props: Wave) {
        super(props);
        // the schema admits any number; the domain admits only a rideable one
        if (props.height > 100)
          throw new Error('a wave over 100ft is not rideable');
      }
    }

    when('the ctor throw is reached through an AWAITED parse', () => {
      // ⭐ the half of the async question that actually carries risk: the guard adds its issue
      // through the SYNC `ctx`. if the async path routed differently, the ctor throw could escape
      // the awaited call as a REJECTION rather than settle as `{ success: false }` — which skips
      // the `if (!result.success)` branch every handler writes, exactly the failhide c9 prevents
      // on the sync path. reasoned in the vision, measured here.
      const heat = z.object({ wave: Wave.contract() });

      then('it CONTAINS as a settled failure, never rejects', async () => {
        const result = await heat.safeParseAsync({ wave: { height: 900 } });
        expect(result.success).toEqual(false);
        expect(result.error!.issues[0]!.path).toEqual(['wave']);
        expect(result.error!.issues[0]!.code).toEqual('custom');
      });

      then(
        'and parseAsync throws a ZodError, not the raw ctor error',
        async () => {
          // the sync `.parse` contract, preserved on the awaited form: one failure channel, and it
          // is the ZodError — never the domain `Error` the constructor raised
          const error = await getError(
            heat.parseAsync({ wave: { height: 900 } }),
          );
          expect(error.constructor.name).toEqual('ZodError');
          expect(error.message).toContain('Wave');
        },
      );
    });

    when('the rejected payload sits inside an ARRAY element', () => {
      // ⭐ the combination c9/c10 and c17 each cover one half of and neither covers together: a ctor
      // throw from item N of an array of dobjs. the guarantee under test is not merely
      // "contained" — it is that the issue path carries the INDEX, so an error names *which*
      // element failed. a path of `['heat']` (or a malformed one) would leave a caller to hunt
      // through the array by hand, which is the exact ergonomic this repo's path-tagged issues
      // exist to spare them.
      const heat = z.object({ waves: z.array(Wave.contract()) });
      const result = heat.safeParse({
        waves: [{ height: 4 }, { height: 6 }, { height: 900 }],
      });

      then('the throw is contained for an element too', () => {
        expect(result.success).toEqual(false);
        expect(() =>
          heat.safeParse({ waves: [{ height: 900 }] }),
        ).not.toThrow();
      });

      then('⭐ the issue path carries the failed ELEMENT INDEX', () => {
        // `['waves', 2]` — the third element, not merely `['waves']`
        expect(result.error!.issues[0]!.path).toEqual(['waves', 2]);
        expect(result.error!.issues[0]!.code).toEqual('custom');
        expect(result.error!.issues[0]!.message).toContain('Wave');
      });

      then('the good elements are not blamed', () => {
        // exactly one issue — a contained failure must not cascade onto its siblings
        expect(result.error!.issues).toHaveLength(1);
      });
    });

    when(
      'the payload reaches the constructor through a PARENT contract',
      () => {
        // the reachable path the clamp must walk: the parent accepts the payload, and the NESTED
        // dobj is the one that rejects it — so the throw happens mid-parse, deep in the tree
        const heat = z.object({ wave: Wave.contract() });
        const result = heat.safeParse({ wave: { height: 900 } });

        then('c9 — the throw is contained, never escapes safeParse', () => {
          expect(result.success).toEqual(false);
          expect(() => heat.safeParse({ wave: { height: 900 } })).not.toThrow();
        });

        then('the issue is path-tagged to the field that failed', () => {
          expect(result.error!.issues[0]!.path).toEqual(['wave']);
          expect(result.error!.issues[0]!.code).toEqual('custom');
        });

        then('c10 — the message names the dobj AND the next move', () => {
          const { message } = result.error!.issues[0]!;
          // names the dobj
          expect(message).toContain('Wave');
          // relays the cause beneath, rather than swallow it
          expect(message).toContain('a wave over 100ft is not rideable');
          // and names the FIX, not merely the symptom
          expect(message).toContain('fix:');
          expect(message).toContain('static schema');
          expect(message).toMatchSnapshot();
        });
      },
    );

    when(
      'the constructor throws a CODE fault rather than a domain error',
      () => {
        interface Reef {
          depth: number;
        }
        class Reef extends DomainLiteral<Reef> implements Reef {
          public static schema = z.object({ depth: z.number() });
          constructor(props: Reef) {
            super(props);
            // stands in for a genuine bug in a constructor — a call on an absent member, which is
            // what a real `TypeError` at this position would be
            if (props.depth < 0)
              throw new TypeError('cannot read properties of undefined');
          }
        }

        then(
          '⛔ it ESCAPES the parse — a bug must not hide in a zod issue',
          () => {
            // the allowlist half of `rule.forbid.failhide`: a catch may contain a payload failure, but
            // a code fault is not one. were it contained, a debugger would meet a zod issue that says
            // "align your static schema" — advice for a defect other than the one they have — and the
            // stack that names the real line would be gone.
            const error = getError(() =>
              Reef.contract().safeParse({ depth: -1 }),
            );
            expect(error).toBeInstanceOf(TypeError);
            expect(error.message).toContain(
              'cannot read properties of undefined',
            );
            // and the wrong guidance is genuinely absent from what the caller sees
            expect(error.message).not.toContain('fix:');
          },
        );

        then(
          '⭐ EVERY native fault type escapes — the set is exhaustive',
          () => {
            // a partial allowlist is worse than none: it fixes the defect for the types it names and
            // leaves the identical misdirection for the rest, while it READS as handled. so the set
            // is enumerated here rather than sampled — every Error subclass a RUNTIME raises itself.
            // data-driven per `rule.prefer.data-driven`, so a new native type is one row to add.
            // ⚠️ `AggregateError` is absent BY DESIGN and is clamped in the opposite direction below.
            const NATIVE_FAULTS = [
              { name: 'EvalError', make: () => new EvalError('boom') },
              { name: 'RangeError', make: () => new RangeError('boom') },
              {
                name: 'ReferenceError',
                make: () => new ReferenceError('boom'),
              },
              { name: 'SyntaxError', make: () => new SyntaxError('boom') },
              { name: 'TypeError', make: () => new TypeError('boom') },
              { name: 'URIError', make: () => new URIError('boom') },
            ];

            for (const thisCase of NATIVE_FAULTS) {
              interface Buoy {
                tag: string;
              }
              class Buoy extends DomainLiteral<Buoy> implements Buoy {
                public static schema = z.object({ tag: z.string() });
                constructor(props: Buoy) {
                  super(props);
                  throw thisCase.make();
                }
              }

              const error = getError(() =>
                Buoy.contract().safeParse({ tag: thisCase.name }),
              );
              // it escaped as ITSELF — not repackaged, not buried in a zod issue
              expect(error.constructor.name).toEqual(thisCase.name);
              expect(error.message).toContain('boom');
              expect(error.message).not.toContain('fix:');
            }
          },
        );

        then(
          '⭐ an AggregateError is CONTAINED — the deliberate exclusion',
          () => {
            // ⚠️ the seventh native subclass, and the only one no runtime can raise into a ctor: a
            // constructor cannot `await`, so it cannot inherit one from a rejected `Promise.any`.
            // the sole way a ctor yields one is a DELIBERATE throw — which is how a validator
            // reports SEVERAL domain failures at once. so it is a payload fault, and to rethrow it
            // would reopen the same failhide from the other side: a real validation failure that
            // escapes `safeParse` as a raw crash, past the `if (!result.success)` branch.
            // ⚠️ the fixture uses the DOMAIN-AGGREGATION shape (a populated `errors` array), not an
            // empty one — an empty AggregateError is not the case the risk is about.
            interface Kelp {
              strands: number;
            }
            class Kelp extends DomainLiteral<Kelp> implements Kelp {
              public static schema = z.object({ strands: z.number() });
              constructor(props: Kelp) {
                super(props);
                throw new AggregateError(
                  [
                    new Error('strands must be positive'),
                    new Error('strands must be whole'),
                  ],
                  'kelp is invalid',
                );
              }
            }

            const result = Kelp.contract().safeParse({ strands: -1.5 });
            expect(result.success).toEqual(false);
            expect(result.error!.issues[0]!.code).toEqual('custom');
            expect(result.error!.issues[0]!.message).toContain(
              'kelp is invalid',
            );
            // and it did NOT escape — the caller's one branch still catches it
            expect(() =>
              Kelp.contract().safeParse({ strands: -1.5 }),
            ).not.toThrow();
          },
        );

        then('a DOMAIN error at the same position is still contained', () => {
          // the other half, asserted beside it so the two can never drift into one rule: the split is
          // by FAULT, not by position — the same call site contains a domain throw and rethrows a bug
          const result = Reef.contract().safeParse({ depth: 0 });
          expect(result.success).toEqual(true);
          const contained = Wave.contract().safeParse({ height: 900 });
          expect(contained.success).toEqual(false);
          expect(contained.error!.issues[0]!.code).toEqual('custom');
        });
      },
    );
  });

  given('a dobj whose nested hydration fails', () => {
    interface Fin {
      count: number;
    }
    class Fin extends DomainLiteral<Fin> implements Fin {
      public static schema = z.object({ count: z.number() });
    }
    interface Leash {
      lengthFt: number;
    }
    class Leash extends DomainLiteral<Leash> implements Leash {
      public static schema = z.object({ lengthFt: z.number() });
    }
    interface Rig {
      hardware: Fin | Leash;
    }
    class Rig extends DomainEntity<Rig> implements Rig {
      public static primary = ['hardware'] as const;
      public static unique = ['hardware'] as const;
      // a POLYMORPHIC nested key: the hydrator, not the schema, settles which arm a value belongs
      // to — so a `_dobj` that names an undeclared class is a hydration failure the schema cannot
      // see. this is the reachable path where the ctor throws a real domain-objects error.
      public static nested = { hardware: [Fin, Leash] };
      public static schema = z.object({ hardware: z.any() });
    }

    when('the contract parses a payload the hydrator rejects', () => {
      const result = Rig.contract().safeParse({
        hardware: { _dobj: 'Skeg', count: 3 },
      });

      then('c11 — the hydration error text survives, un-flattened', () => {
        expect(result.success).toEqual(false);
        const { message } = result.error!.issues[0]!;
        // the hydration error is relayed verbatim inside the issue, so the reader is not left
        // with a generic "could not construct" that buries the actual cause
        expect(message).toContain('Rig');
        expect(message).toContain('hardware');
        // ⭐ the hydrator's OWN words, and its own remedy, both reach the caller
        expect(message).toContain('._dobj');
        expect(message).toContain('Skeg');
        expect(message).toContain('Please check the declared nested');
        expect(message).toMatchSnapshot();
      });
    });
  });

  given('the two-border endpoint an sdk declares', () => {
    // ⭐ the c19 clamp: `io` names the SIDE of the contract, never the BORDER of the endpoint.
    // both borders take `{ io: 'input' }`; the symmetry the eye expects does NOT exist.
    interface Reservation {
      uuid?: string;
      surfer: string;
    }
    class Reservation extends DomainEntity<Reservation> implements Reservation {
      public static primary = ['uuid'] as const;
      public static unique = ['surfer'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        surfer: z.string(),
      });
    }

    const contract = {
      input: z.object({ surfer: Surfer.contract().ref() }),
      output: z.object({ reservation: Reservation.contract() }),
    };

    when('each border is emitted', () => {
      then('c19 — BOTH borders emit under { io: input }', () => {
        const emitInput: Record<string, any> = z.toJSONSchema(contract.input, {
          io: 'input',
        });
        const emitOutput: Record<string, any> = z.toJSONSchema(
          contract.output,
          { io: 'input' },
        );

        // the input border: what the CALLER supplies
        expect(emitInput.properties.surfer['x-domain-object-ref']).toEqual({
          of: 'Surfer',
          by: 'ref',
        });
        // the output border: what the ENDPOINT supplies back — same flag, same pragma
        expect(
          emitOutput.properties.reservation['x-domain-object'].name,
        ).toEqual('Reservation');
      });

      then('c19 — the OUTPUT border under { io: output } throws', () => {
        // the trap: `{ io: 'output' }` on the output BORDER reads natural and is wrong. it asks
        // for the contract's out SIDE — the hydrated instance — which is not json.
        const error = getError(() =>
          z.toJSONSchema(contract.output, { io: 'output' }),
        );
        expect(error.message).toContain('JSON Schema');
        // ⭐ and PIN the exact text, not merely a fragment of it. this message is **zod's**, not
        // ours — the vision's own §8 names it the weakest seam, precisely because it is the one
        // failure an adopter meets in words this lib does not author. a `.toContain` survives a
        // reword into text that guides less, across a version bump; a snapshot surfaces the change
        // in the diff, where the readme + `#17` handoff can be re-checked against it. the twin
        // hazard (the bare `X.contract` at a schema position) already pins its text this way.
        expect(error.message).toMatchSnapshot();
      });

      then('a coerced position under the DEFAULT io throws too', () => {
        // the default is `'output'`, so an emit that forgets the flag fails loudly rather than
        // emits a wrong document — the pit of success for the one rule an sdk must hold
        const error = getError(() => z.toJSONSchema(Surfer.contract()));
        expect(error.message).toContain('JSON Schema');
        // pinned for the same reason as above — and kept SEPARATE from the border case, since the
        // two reach the throw by different routes (an explicit flag vs an omitted one) and zod is
        // free to word them differently
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('the ONE key that differs between the two io faces', () => {
    /**
     * ⭐ the clamp for the pr's single most widespread snapshot delta: `additionalProperties: false`
     * is absent from every emitted document, because every emit now passes `{ io: 'input' }`.
     *
     * ⚠️ three independent peer lenses read that diff and called it *"a weakened assertion — the
     * contract used to forbid unknown keys and now allows them"*. that reading is wrong, and it is
     * wrong in a way no amount of prose can settle, so it is settled by measurement here instead:
     *
     *   1. the two faces differ by EXACTLY that one key — `properties`, `required`, `type` and the
     *      pragma are identical, so no part of the payload description was lost
     *   2. the runtime NEVER rejected an unknown key. zod's `z.object` strips by default (it is
     *      `.strict()` that rejects), so an extra key parsed fine before this pr and parses fine
     *      after. `additionalProperties: false` on the OUT face was a true statement about the
     *      value a parse HANDS BACK (extras already stripped), never a validation guarantee about
     *      what a caller may SEND
     *
     * so the document got *more* accurate, not laxer: the in face describes what a caller may send,
     * and a caller may send extras — they are ignored.
     *
     * .note = the subject is a `.ref()` (a plain pick, no coerce) on purpose — it is the only shape
     *   that can emit BOTH faces, since a coerced contract's out side is a class instance and throws.
     */
    interface Diver {
      uuid?: string;
      handle: string;
    }
    class Diver extends DomainEntity<Diver> implements Diver {
      public static primary = ['uuid'] as const;
      public static unique = ['handle'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        handle: z.string(),
      });
    }

    when('a plain (non-coerced) schema is emitted on both faces', () => {
      const ref = Diver.contract().ref('unique');
      const faceIn: Record<string, any> = z.toJSONSchema(ref, { io: 'input' });
      const faceOut: Record<string, any> = z.toJSONSchema(ref, {
        io: 'output',
      });

      then(
        'the out face carries additionalProperties: false, the in face does not',
        () => {
          expect(faceOut.additionalProperties).toEqual(false);
          expect(faceIn.additionalProperties).toBeUndefined();
        },
      );

      then('⭐ and that is the ONLY difference — measured, key by key', () => {
        const { additionalProperties: _dropped, ...faceOutRest } = faceOut;
        expect(faceIn).toEqual(faceOutRest);
        // spelled out, so a reader need not trust the spread: every part that describes the
        // payload is byte-identical across the two faces
        expect(faceIn.properties).toEqual(faceOut.properties);
        expect(faceIn.required).toEqual(faceOut.required);
        expect(faceIn['x-domain-object-ref']).toEqual(
          faceOut['x-domain-object-ref'],
        );
      });
    });

    when('a payload carries an UNKNOWN key', () => {
      then(
        '⭐ it is STRIPPED, not rejected — so no validation guarantee was ever lost',
        () => {
          // this is the assertion that answers the peer blockers. if the emit delta had weakened
          // validation, this parse would have to have thrown BEFORE the change and pass after —
          // but zod's `z.object` strips by default at BOTH faces, and always did.
          const parsed = Diver.contract().ref('unique').parse({
            handle: '@kai',
            depth: 40,
          });
          expect(parsed).toEqual({ handle: '@kai' });
          expect('depth' in parsed).toEqual(false);
        },
      );

      then(
        'the same holds at a COERCED position — extras never reach the instance',
        () => {
          const hydrated = z
            .object({ diver: Diver.contract() })
            .parse({ diver: { handle: '@kai', depth: 40 } });
          expect(hydrated.diver).toBeInstanceOf(Diver);
          expect('depth' in hydrated.diver).toEqual(false);
        },
      );
    });
  });

  given('the pragma on a coerced position', () => {
    when('it rides an emit through a wrapper and an array item', () => {
      const wrapper = z.object({
        one: Surfer.contract(),
        many: z.array(Surfer.contract()),
      });
      const emitted: Record<string, any> = z.toJSONSchema(wrapper, {
        io: 'input',
      });

      then('c12 — the pragma survives both positions', () => {
        expect(emitted.properties.one['x-domain-object'].name).toEqual(
          'Surfer',
        );
        // an array carries no pragma of its own; its ITEM schema does
        expect(emitted.properties.many['x-domain-object']).toBeUndefined();
        expect(emitted.properties.many.items['x-domain-object'].name).toEqual(
          'Surfer',
        );
      });

      then('the whole emit matches snapshot', () => {
        expect(emitted).toMatchSnapshot();
      });
    });

    when('it rides an emit through .nullable() and .optional()', () => {
      // ⭐⭐ the asymmetry a naive lookup trips over, and the gap c12 above had: the two most common
      // wrapper ops do NOT put the pragma in the same place.
      //   .optional()  → the pragma stays DIRECTLY on the field node
      //   .nullable()  → zod emits an `anyOf: [<schema>, { type: 'null' }]`, so the pragma RELOCATES
      //                  onto `anyOf[0]`, and the naive `properties.x['x-domain-object']` reads
      //                  `undefined` — silently, with no error at compile, build, or parse
      // this is the one shape most likely to bite: it is what the readme's own canonical lookup
      // does, and `sponsor: Surfboard.contract().nullable()` sits one field over in this very file's
      // `Surfer` fixture — so the extant clamp walked past it.
      const wrapper = z.object({
        maybeNull: Surfboard.contract().nullable(),
        maybeAbsent: Surfboard.contract().optional(),
      });
      const emitted: Record<string, any> = z.toJSONSchema(wrapper, {
        io: 'input',
      });

      then('⚠️ .nullable() RELOCATES the pragma onto anyOf[0]', () => {
        // the naive lookup the readme teaches — reads undefined, which is the whole hazard
        expect(emitted.properties.maybeNull['x-domain-object']).toBeUndefined();
        // and here is where it actually lives
        expect(
          emitted.properties.maybeNull.anyOf[0]['x-domain-object'],
        ).toEqual({ name: 'Surfboard', kind: 'literal' });
      });

      then('✅ .optional() keeps the pragma DIRECTLY on the field', () => {
        // the asymmetry, asserted rather than assumed — so a zod change to either op goes red
        expect(emitted.properties.maybeAbsent['x-domain-object']).toEqual({
          name: 'Surfboard',
          kind: 'literal',
        });
      });

      then('the wrapped emit matches snapshot', () => {
        expect(emitted).toMatchSnapshot();
      });
    });

    when('a NON-null value is parsed through a .nullable() position', () => {
      // ⚠️ the twin gap: every fixture in this repo only ever sends `sponsor: null`, so the POSITIVE
      // coercion path through `.nullable()` was never walked. a chain op returns a fresh schema, so
      // "the coerce rides through .nullable()" is a claim that deserved a clamp of its own.
      const wrapper = z.object({ sponsor: Surfboard.contract().nullable() });

      then('it still hydrates into a live instance', () => {
        const parsed = wrapper.parse({
          sponsor: { brand: 'Firewire', length: 68 },
        });
        expect(parsed.sponsor).toBeInstanceOf(Surfboard);
        expect(parsed.sponsor!.brand).toEqual('Firewire');
      });

      then('and a null still stays null', () => {
        expect(wrapper.parse({ sponsor: null }).sponsor).toEqual(null);
      });
    });

    when('a value is parsed through an .optional() position', () => {
      // ⭐⭐ the TWIN gap, found at the 5.3 verification gate. the `.nullable()` parse clamp
      // directly above was added at i011 with this reason:
      //
      //   *"every fixture only ever sends `sponsor: null`, so the POSITIVE coercion path was never
      //    walked. a chain op returns a FRESH schema, so 'the coerce rides through .nullable()' is
      //    a claim that deserved a clamp of its own."*
      //
      // that argument is about **chain ops in general**, not about `.nullable()` — yet it was
      // applied to one op and not its twin. `.optional()` had an EMIT clamp (the pragma stays on
      // the field node) and a COMPILE clamp (`.ref` is dropped by the chain), and no PARSE clamp at
      // all. so "a coerce survives `.optional()`" was an unproven claim that sat one line away from
      // the proof its twin needed.
      //
      // this is the same class as p24 / p25 / p33: a neighbour surface holds a guarantee and this
      // one does not, and the near-duplicate IS the defect. clamped here rather than noted.
      const wrapper = z.object({ sponsor: Surfboard.contract().optional() });

      then('a present value still hydrates into a live instance', () => {
        const parsed = wrapper.parse({
          sponsor: { brand: 'Channel Islands', length: 60 },
        });
        expect(parsed.sponsor).toBeInstanceOf(Surfboard);
        expect(parsed.sponsor!.brand).toEqual('Channel Islands');
      });

      then(
        'an ABSENT key stays absent — never coerced into an empty dobj',
        () => {
          // the negative control the `.nullable()` twin has as "a null stays null": a coerce that
          // fired on `undefined` would hand back a `Surfboard` built from no props, which is exactly
          // the vacuous-success shape q24 was about, one surface over.
          //
          // ⚠️ HONEST LIMIT, measured: this half is a POSITIVE control under the one revert available
          // here. neutering the transform to `(props) => props` turns the clamp above red and leaves
          // this one green — a no-op coerce also leaves `undefined` alone. it guards a DIFFERENT
          // regression (a coerce that fires on an absent key), which no revert of our own code
          // reaches, because zod decides whether to invoke the transform at an optional position.
          // kept, and labelled, rather than dropped or mistaken for a clamp with teeth.
          const parsed = wrapper.parse({});
          expect(parsed.sponsor).toBeUndefined();
          expect('sponsor' in parsed).toEqual(false);
        },
      );
    });
  });

  given('a coerced position inside a zod COMBINATOR', () => {
    // ⭐ the shape family that RHYMES with the .nullable() hazard above, and does not repeat it.
    //
    // `z.union` and `z.discriminatedUnion` emit the same `anyOf` / `oneOf` family that made
    // `.nullable()` relocate its pragma, so the suspicion is fair. measured, the two diverge — and
    // the reason is structural rather than incidental, which is why it is worth a clamp AND a note:
    //
    //   a chain op WRAPS the dobj's own node   → `.nullable()` inserts an `anyOf` ABOVE the node,
    //                                            so the pragma moves AWAY from the address a reader
    //                                            already had. that is a relocation.
    //   a combinator PLACES the node as a child → `anyOf[i]` / `additionalProperties` IS the address
    //                                            the author wrote the dobj at. no prior address lost
    //                                            the pragma, because none ever held it.
    //
    // so the lookup a codegen performs is the lookup the author's own structure implies, in every
    // shape below. a regression that broke that would be silent, hence these clamps.

    when('it is an arm of a z.union', () => {
      const schema = z.union([Surfboard.contract(), Surfer.contract()]);
      const emitted: Record<string, any> = z.toJSONSchema(schema, {
        io: 'input',
      });

      then('instantiation — the matched arm still hydrates', () => {
        const parsed = schema.parse({ brand: 'Firewire', length: 68 });
        expect(parsed).toBeInstanceOf(Surfboard);
      });

      then('introspection — each arm keeps its OWN pragma, in place', () => {
        // the negative control for the relocation hazard: had the union behaved like `.nullable()`,
        // one of these would read `undefined` and the other would carry a merged or lifted pragma
        expect(emitted.anyOf[0]['x-domain-object']).toEqual({
          name: 'Surfboard',
          kind: 'literal',
        });
        expect(emitted.anyOf[1]['x-domain-object'].name).toEqual('Surfer');
        // and no pragma is lifted onto the union node itself
        expect(emitted['x-domain-object']).toBeUndefined();
      });
    });

    when('it is the VALUE schema of a z.record', () => {
      const schema = z.record(z.string(), Surfboard.contract());

      then('instantiation — each value hydrates', () => {
        const parsed = schema.parse({
          daily: { brand: 'Firewire', length: 68 },
        });
        expect(parsed.daily).toBeInstanceOf(Surfboard);
      });

      then('introspection — the pragma rides `additionalProperties`', () => {
        const emitted: Record<string, any> = z.toJSONSchema(schema, {
          io: 'input',
        });
        // a record carries no pragma of its own, exactly as an array carries none (c12)
        expect(emitted['x-domain-object']).toBeUndefined();
        expect(emitted.additionalProperties['x-domain-object']).toEqual({
          name: 'Surfboard',
          kind: 'literal',
        });
      });
    });

    when('it is a FIELD of a z.discriminatedUnion arm', () => {
      const schema = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('rides'), board: Surfboard.contract() }),
        z.object({ kind: z.literal('owns'), boards: z.array(z.string()) }),
      ]);
      const emitted: Record<string, any> = z.toJSONSchema(schema, {
        io: 'input',
      });

      then('instantiation — the field still hydrates', () => {
        const parsed = schema.parse({
          kind: 'rides',
          board: { brand: 'Firewire', length: 68 },
        });
        expect((parsed as any).board).toBeInstanceOf(Surfboard);
      });

      then('introspection — the pragma stays on the field node', () => {
        expect(emitted.oneOf[0].properties.board['x-domain-object']).toEqual({
          name: 'Surfboard',
          kind: 'literal',
        });
      });
    });

    when('a bare dobj contract is used as a discriminatedUnion ARM', () => {
      // ⚠️ the one shape in this family that does NOT work — and it fails LOUD, which is why it is
      // a clamp rather than a defect. a dobj's schema declares no literal discriminator, so zod has
      // no key to switch on. note the failure is DEFERRED to parse: the build and the emit both
      // succeed, so a test that only emitted would have reported a false green.
      const schema = (
        z.discriminatedUnion as unknown as (
          key: string,
          arms: unknown[],
        ) => z.ZodType<any, any>
      )('kind', [Surfboard.contract(), Surfer.contract()]);

      then(
        'the emit still succeeds — so an emit-only test proves none of it',
        () => {
          const emitted: Record<string, any> = z.toJSONSchema(schema, {
            io: 'input',
          });
          expect(emitted.oneOf[0]['x-domain-object'].name).toEqual('Surfboard');
        },
      );

      then('but the PARSE refuses, and names the arm it refused', () => {
        const error = getError(() =>
          schema.parse({ brand: 'Firewire', length: 68 }),
        );
        expect(error.message).toContain('discriminated union');
        expect(error.message).toContain('0');
      });
    });
  });

  given(
    'the BARE property, which is no longer a schema (the removed form)',
    () => {
      when('it is inspected at runtime', () => {
        then('c7 — it is a function, and NOT a zod schema', () => {
          expect(typeof Surfer.contract).toEqual('function');
          expect(Surfer.contract instanceof z.ZodType).toEqual(false);
          // the old bridge made `typeof` report 'function' while `instanceof ZodType` stayed true;
          // this pair is what proves the bridge did not creep back
          expect(Surfer.contract()).toBeInstanceOf(z.ZodType);
        });

        then('c7 — a parse through the bare position fails loudly', () => {
          // the failure mode the removal exists to produce: an author who forgets the call gets a
          // loud throw AT THE POSITION, and the message names the fix in zod's own words —
          // never a schema that silently validates the wrong thing
          const parent = z.object({ surfer: Surfer.contract });
          const error = getError(() => parent.parse({ surfer: wireSurfer }));
          expect(error.message).toContain('expected a Zod schema');
          expect(error.message).toContain('surfer');
          expect(error.message).toMatchSnapshot();
        });
      });

      when('it is used at the type level', () => {
        then(
          'c8 — ⚠️ the compile guard does NOT exist; the clamp is runtime',
          () => {
            // MEASURED, and recorded rather than wished away (`rule.forbid.failhide`): zod types an
            // object's shape as `$ZodLooseShape = Record<string, any>`, and `ZodObject` carries an
            // internal ts-suppression comment on its cast variance. so ANY value — a function, a
            // number — is accepted at a schema position at COMPILE time. an expect-error directive
            // here would go unused and fail `tsc` (TS2578), which is how this limit was found.
            //
            // the guarantee therefore rests entirely on c7's runtime throw. re-check at each zod
            // major: if `$ZodLooseShape` ever narrows to a schema type, promote this to a compile clamp.
            const parent = z.object({ surfer: Surfer.contract });
            expect(parent).toBeDefined();
          },
        );

        then('c8 — the inferred position does not erase to any', () => {
          // the one type-level half that DOES hold: even at the bare position, the inferred parse
          // result is a concrete type, so a downstream `z.infer` never silently widens to `any`
          const parent = z.object({ surfer: Surfer.contract });
          type Parsed = z.infer<typeof parent>;
          assertType<Equals<IsAny<Parsed>, false>>();
          // the runtime witness: the bare position is a plain fn, never a schema — so the type
          // above describes a position that can only ever throw, which is the intended end state
          expect(Surfer.contract instanceof z.ZodType).toEqual(false);
        });
      });
    },
  );

  given('the forms the surface deliberately does NOT offer', () => {
    when('a caller reaches for a removed form', () => {
      then('c6 — a ref carries no call signature (never re-coercible)', () => {
        // both halves of the removal: a compile error (pinned by @ts-expect-error, which is
        // CONSUMED — if the form ever compiles, tsc fails on the unused directive) and a runtime
        // TypeError. a ref names a dobj by key; it never re-coerces into the whole dobj.
        const error = getError(() =>
          // @ts-expect-error - a ref is a plain schema; it is not callable
          Surfer.contract().ref('primary')(),
        );
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('is not a function');
      });

      then('a DETACHED receiver is refused at compile, not at runtime', () => {
        // ⚠️ three artifacts disagreed about this hazard until it was measured here, so the
        // measurement is the clamp:
        //   the vision  — "widens the captured param to `unknown`, SILENTLY"
        //   the vision  — "the impl must also fail loud at RUNTIME when `this` lacks `.schema`"
        //   getContract — "a detached receiver is a COMPILE error"
        //
        // measured: the LAST one holds. the `this` parameter is bound on `ConstructorOf<any>`, and
        // a standalone call supplies `void` for `this`, which does not satisfy that bound — so the
        // detach is refused at compile. the directive below is CONSUMED; if the type ever widens
        // to admit a detached call, tsc fails on the unused directive (TS2578).
        const detached = Surfer.contract;
        // @ts-expect-error - `this` is void at a standalone call; it cannot satisfy the bound
        const boundary = detached();

        // and at RUNTIME the detached call is nonetheless CORRECT rather than loud — the returned
        // fn closes over its dobj and reads no `this` at all. so the vision's runtime-throw demand
        // is not unmet; it is MOOT: there is no state where `this` lacks `.schema` to detect.
        // a compile refusal plus a correct runtime beats a runtime throw on both axes.
        expect(boundary).toBeInstanceOf(z.ZodType);
        expect(boundary).toBe(Surfer.contract());
      });

      then('f7 — there is no .coerce(); the call already coerces', () => {
        const error = getError(() =>
          // @ts-expect-error - `.coerce` was never shipped; `X.contract()` coerces by default
          Surfer.contract().coerce(),
        );
        expect(error).toBeInstanceOf(TypeError);
      });

      then("f11 — .ref('ref') is gone, at BOTH surfaces", () => {
        const error = getError(() =>
          // @ts-expect-error - 'ref' is not an accepted grain; call `.ref()` with no argument
          Surfer.contract().ref('ref'),
        );
        // ⭐ the runtime AGREES with the type rather than quietly accepts what ts forbids — the
        // same *loud refusal over silent success* that removed the bare `.contract` at f10
        expect(error.message).toContain('is not a grain');
        // and it names the fix, rather than only the symptom (`rule.require.errors-name-the-fix`)
        expect(error.message).toContain('.ref()');
      });

      then("f11 — ⭐ but the WIRE pragma still carries by: 'ref'", () => {
        // ⚠️ the distinction the refusal above must not blur: `'ref'` is still the internal
        // normalized value and the published pragma value. f11 removed a caller's ARGUMENT, never
        // the vocabulary — so a downstream codegen that keys on `by: 'ref'` is unaffected.
        const emitted = z.toJSONSchema(
          z.object({ rider: Surfer.contract().ref() }),
          { io: 'input' },
        ) as Record<string, any>;
        expect(emitted.properties.rider['x-domain-object-ref'].by).toEqual(
          'ref',
        );
      });
    });
  });

  given('a consumer who upgrades from the pre-call surface', () => {
    // ⭐ the migration hazard — and the one removed form in this feature that shipped with no clamp.
    // before this release `X.contract` WAS a zod schema, so `X.contract.parse(wire)` and
    // `X.contract.ref(by)` were the calling convention that worked. today `X.contract` is a plain
    // function with neither own property, so both break — and this is the FIRST failure an extant
    // consumer meets on upgrade day. every OTHER removed form here (c6, f7, f11, the chain-order
    // hazard) already carries the paired compile+runtime clamp below; this one did not.

    when('the caller reaches for the pre-call `.parse`', () => {
      then('⛔ it is refused at compile AND at runtime', () => {
        // @ts-expect-error - `X.contract` is a plain fn; `.parse` lives on `X.contract()` (f10)
        Surfer.contract.parse;

        // and as a js caller meets it — widened on ONE line so the formatter cannot split the
        // expression and orphan a directive onto the wrong line (measured; see the chain-op clamp)
        const stale = Surfer.contract as any;
        const error = getError(() => stale.parse(wireSurfer));
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('not a function');
      });
    });

    when('the caller reaches for the pre-call `.ref`', () => {
      then('⛔ it is refused at compile AND at runtime', () => {
        // @ts-expect-error - `.ref` moved onto the CALL, where it can name the dobj (f8)
        Surfer.contract.ref;

        const stale = Surfer.contract as any;
        const error = getError(() => stale.ref('primary'));
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('not a function');
      });
    });

    when('the caller applies the migration', () => {
      then('✅ each form is one pair of parens away', () => {
        // the whole migration, asserted rather than only prose in the readme:
        //   X.contract        → X.contract()
        //   X.contract.ref(by) → X.contract().ref(by)
        expect(Surfer.contract().parse(wireSurfer)).toBeInstanceOf(Surfer);
        expect(
          Surfer.contract().ref('primary').parse({ uuid: 'surfer-1' }),
        ).toEqual({ uuid: 'surfer-1' });
      });
    });
  });

  given('a dobj whose schema predates zod v4', () => {
    // ⚠️ `isZodSchema` duck-types on `.safeParse`, which zod v3 exposes too — so a v3 schema clears
    // that guard and then meets a raw `TypeError: schema.meta is not a function` from inside the
    // pragma stamp, since `.meta()` is v4's metadata registry with no v3 equivalent. every OTHER
    // structural mismatch on this surface (absent schema, joi/yup) speaks in a named ConstraintError
    // that says what to do; this one spoke in a stack trace from a dependency's internals.

    /** a stand-in for a v3 schema: it answers `.safeParse` (so `isZodSchema` admits it) but has no `.meta` */
    const schemaOfV3Shape = {
      safeParse: () => ({ success: true, data: {} }),
      parse: (value: any) => value,
    };

    interface Relic {
      name: string;
    }
    class Relic extends DomainLiteral<Relic> implements Relic {
      public static schema = schemaOfV3Shape as any;
    }

    when('a caller touches `.contract`', () => {
      then('⛔ it raises a named ConstraintError, not a raw TypeError', () => {
        const error = getError(() => Relic.contract);
        // the clamp BITES on the defect itself: a raw TypeError is exactly what regressed here
        expect(error).not.toBeInstanceOf(TypeError);
        expect(error.constructor.name).toEqual('ConstraintError');
      });

      then('⛔ and the message names the version AND the fix', () => {
        const error = getError(() => Relic.contract);
        expect(error.message).toContain('requires zod v4+');
        expect(error.message).toContain('.meta()');
        expect(error.message).toContain('upgrade zod to v4');
      });
    });
  });

  given('a contract reached AFTER a zod chain op', () => {
    // ⭐ the chain-order hazard: `.ref(by)` must be called on the RAW `.contract()`. a zod chain op
    // returns a FRESH schema, and `.ref` is an own property hung onto the original — so it does not
    // ride along. documented in three places (`getContract.ts`, `DomainObject.ts`, the readme) and,
    // until this clamp, verified in none: a `rule.require.clamp-edge-cases` gap on the caveat a
    // consumer trips over first, since an optional/nullable ref field is an ordinary shape to want.
    // clamped in BOTH halves, the twin of the detached-receiver pair above: the compile refusal is
    // what a typescript consumer meets, the runtime throw is what a js consumer meets.

    when('the caller chains first and asks for a ref second', () => {
      then(
        '⛔ the compile refuses it — `.ref` is absent from the fresh schema',
        () => {
          // @ts-expect-error - `.optional()` yields a plain ZodOptional, which carries no `.ref`
          Surfer.contract().optional().ref;
          // @ts-expect-error - same for `.nullable()`
          Surfer.contract().nullable().ref;
          // ⚠️ these directives are SELF-CHECKED: the day a chain op carries `.ref` through, the
          // directive goes unused and `tsc` fails TS2578 — so the clamp cannot rot into a no-op.
        },
      );

      then('⛔ and the runtime throws, rather than yield undefined', () => {
        // ⚠️ reached as a js caller would: the chained schema is widened to `any` on ONE line, so
        // the formatter cannot split the chain and orphan a `@ts-expect-error` onto the wrong line
        // (measured — it did exactly that, and `tsc` caught it as an unused directive)
        const chained = Surfer.contract().optional() as any;
        const error = getError(() => chained.ref('primary'));
        expect(error).toBeInstanceOf(TypeError);
        // it is an absent MEMBER, not a bad argument — the distinction a debugger needs
        expect(error.message).toContain('not a function');
      });
    });

    when('the caller embeds the ref FIRST, then chains', () => {
      then('✅ the documented order works, and stays a ref', () => {
        // the fix the doc-notes prescribe, asserted rather than only described
        const schema = z
          .object({ rider: Surfer.contract().ref('primary') })
          .optional();
        expect(schema.parse({ rider: { uuid: 'surfer-1' } })).toEqual({
          rider: { uuid: 'surfer-1' },
        });
        expect(schema.parse(undefined)).toEqual(undefined);
      });
    });
  });

  given('a TREE-SHAPED dobj that must reference itself', () => {
    // ⚠️ a tree (`Comment` with `replies: Comment[]`, `Category` with `children`, an org chart) is an
    // ordinary domain shape, and it is the ONE shape this surface makes awkward. per js class-field
    // evaluation order, a static field's initializer runs BEFORE that field is assigned onto the
    // constructor — so `X.contract()` called from inside `X`'s own `static schema` initializer reads
    // `X.schema === undefined` and hits the no-schema guard.
    //
    // ⭐ the hazard is NEW with this feature: `static nested = { replies: Comment }` is a bare
    // identifier reference and was always fine. `.contract()` is the first surface that asks a dobj
    // to CALL a method on itself mid-initializer.

    when('it self-references DIRECTLY, mid-initializer', () => {
      then('it fails with a message that names z.lazy as the fix', () => {
        const error = getError(() => {
          interface Reply {
            uuid?: string;
            text: string;
            replies: Reply[];
          }
          class Reply extends DomainEntity<Reply> implements Reply {
            public static primary = ['uuid'] as const;
            public static nested = { replies: Reply };
            public static schema = z.object({
              uuid: z.string().optional(),
              text: z.string(),
              replies: z.array(Reply.contract()), // ⛔ Reply.schema is not assigned yet
            });
          }
          return Reply;
        });

        // ⭐ the bite: the OLD message said only *"declare `static schema` on Reply"* — which is
        // actively wrong here, since the author plainly did. it must name the second cause too
        expect(error.message).toContain('SELF-REFERENCE');
        expect(error.message).toContain('z.lazy(() => Reply.contract())');
        // and it must still name the ordinary cause, for the dobj that genuinely forgot one
        expect(error.message).toContain('declare `static schema`');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('it self-references through z.lazy', () => {
      interface Node2 {
        uuid?: string;
        text: string;
        kids: Node2[];
      }
      class Node2 extends DomainEntity<Node2> implements Node2 {
        public static primary = ['uuid'] as const;
        public static nested = { kids: Node2 };
        public static schema = z.object({
          uuid: z.string().optional(),
          text: z.string(),
          kids: z.array(z.lazy(() => Node2.contract())), // ⭐ deferred to first parse/emit
        });
      }

      then('the instantiation concern holds — it hydrates RECURSIVELY', () => {
        const out: any = Node2.contract().parse({
          text: 'root',
          kids: [{ text: 'child', kids: [{ text: 'grandchild', kids: [] }] }],
        });
        expect(out).toBeInstanceOf(Node2);
        expect(out.kids[0]).toBeInstanceOf(Node2);
        // ⭐ depth 3 — a fix that only deferred one level would pass at depth 1 and fail here
        expect(out.kids[0].kids[0]).toBeInstanceOf(Node2);
        expect(out.kids[0].kids[0].text).toEqual('grandchild');
        // and the root still carries `.clone`, as every other coerced root does
        expect(typeof out.clone).toEqual('function');
      });

      then(
        'the introspection concern holds — it emits as a $ref, pragma intact',
        () => {
          const json: Record<string, any> = z.toJSONSchema(Node2.contract(), {
            io: 'input',
          });
          // ⚠️ this half is the one a ctor-only clamp would leave unverified, and introspection is
          // half of this feature's own contract. zod represents the recursion as a json-schema $ref
          expect(json.properties.kids.items).toEqual({ $ref: '#' });
          expect(json['x-domain-object'].name).toEqual('Node2');
          expect(json['x-domain-object'].nested).toEqual({ kids: 'Node2' });
          expect(json).toMatchSnapshot();
        },
      );

      then('c15 idempotence holds through the recursion', () => {
        const wire = { text: 'root', kids: [{ text: 'child', kids: [] }] };
        const once: any = Node2.contract().parse(wire);
        const twice: any = Node2.contract().parse(once);
        expect(JSON.parse(JSON.stringify(twice))).toEqual(
          JSON.parse(JSON.stringify(once)),
        );
        expect(twice.kids[0]).toBeInstanceOf(Node2);
      });
    });
  });

  given('repeated access to the contract surface', () => {
    when('the same class is asked twice', () => {
      then('c18 — the fn, the boundary, and each ref are memoized', () => {
        expect(Surfer.contract).toBe(Surfer.contract);
        expect(Surfer.contract()).toBe(Surfer.contract());
        expect(Surfer.contract().ref()).toBe(Surfer.contract().ref());
        expect(Surfer.contract().ref('primary')).toBe(
          Surfer.contract().ref('primary'),
        );
        expect(Surfer.contract().ref('unique')).toBe(
          Surfer.contract().ref('unique'),
        );
      });
    });
  });

  given('EVERY refusal this surface can raise', () => {
    // ⭐ this pr REMOVES the bare `X.contract` as a schema (f10), so a message that leads with the
    // bare token names a form that no longer works — at the one moment a reader is most receptive
    // and most likely to copy what they see. three templates led with it while seven others on the
    // same surface already led with `.contract()`, which is the tell: a near-duplicate that holds a
    // guarantee its twin drops is the defect, not a variation.
    //
    // ⚠️ so the clamp SWEEPS rather than asserts three strings. an assertion per template would go
    // green the day a FOURTH template repeats the defect; this one goes red, because it derives its
    // subjects from the surface rather than from a list someone must remember to extend.

    /** provoke each reachable refusal, so the sweep reads real messages rather than fixtures */
    const refusals = (): { at: string; message: string }[] => {
      class Driftwood extends DomainLiteral<any> {}

      class JoiSandbar extends DomainLiteral<any> {
        public static schema = { validate: () => undefined } as any;
      }

      class Relic extends DomainLiteral<any> {
        // answers `.safeParse` (so the zod duck-type admits it) but has no `.meta` — a v3 stand-in
        public static schema = { safeParse: () => ({ success: true }) } as any;
      }

      class Fin extends DomainLiteral<any> {
        public static schema = z.string();
      }

      class Keyless extends DomainLiteral<any> {
        public static schema = z.object({ name: z.string() });
      }

      return [
        {
          at: 'no schema',
          message: getError(() => Driftwood.contract()).message,
        },
        {
          at: 'non-zod schema',
          message: getError(() => JoiSandbar.contract()).message,
        },
        {
          at: 'zod v3 schema',
          message: getError(() => Relic.contract()).message,
        },
        {
          at: 'non-object schema',
          message: getError(() => Fin.contract()).message,
        },
        {
          at: 'no key grains',
          message: getError(() => Keyless.contract().ref()).message,
        },
        {
          at: "ref('ref')",
          message: getError(() => (Surfer.contract().ref as any)('ref'))
            .message,
        },
        {
          at: 'ref(unrecognized)',
          message: getError(() => (Surfer.contract().ref as any)('nope'))
            .message,
        },
      ];
    };

    when('a caller reads what each one tells them to do', () => {
      then('⭐ every mention of the surface names the CALLED form', () => {
        for (const refusal of refusals()) {
          // a bare `.contract` not followed by `(` is the removed form — it must appear nowhere
          expect({
            at: refusal.at,
            bare: refusal.message.match(/\.contract(?!\()/g) ?? [],
          }).toEqual({ at: refusal.at, bare: [] });
        }
      });

      then(
        'and each is a real, non-empty refusal — so the sweep has subjects',
        () => {
          const found = refusals();
          expect(found).toHaveLength(7);
          for (const refusal of found) {
            // guards the sweep against a vacuous pass: `getError` hands back a NoErrorThrownError
            // when the subject does NOT throw, and that would carry no `.contract` either
            expect(refusal.message).toContain('.contract()');
            expect(refusal.message).not.toContain('No error was thrown');
          }
        },
      );
    });
  });
});
