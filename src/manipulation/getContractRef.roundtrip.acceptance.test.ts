import { given, then, when } from 'test-fns';
import { z } from 'zod';

// acceptance tests are blackbox: reach the deliverable through the PUBLIC barrel only, exactly as a
// cross-service consumer (sdk-aws-lambda) would — never an internal file path
import {
  DomainEntity,
  type DomainObjectPragmaRef,
  refByPrimary,
  refByUnique,
} from '@src/index';

/**
 * .what = the cross-service reference roundtrip journey `.contract().ref` exists to enable: an upstream
 *   author composes a contract that references other dobjs by key, ships it as json-schema over the
 *   wire, and a downstream consumer reads the `x-domain-object-ref` pragma back out to reconstruct
 *   each typed reference — producer → wire → consumer, end to end, through the public barrel alone.
 * .why = every unit test asserts the pragma is PRESENT on the schema; none prove it is USABLE. this
 *   walks the whole path the wish describes (svc-surf publishes, sdk-aws-lambda consumes), so the
 *   deliverable is proven by its real use — extract the ref, rebuild it, validate a live payload —
 *   not merely by its stamped shape.
 */

// ---- the consumer half: a faithful stand-in for the sdk-aws-lambda codegen walk -----------------

/**
 * .what = emit a contract as json-schema, on the input face
 * .why = `{ io: 'input' }` unconditionally, at every emit and at every border — the one line an sdk
 *   owes its emit helper. a `.contract()` coerces, so its OUT face is a live class instance, which
 *   json-schema cannot represent; the IN face is also the only one that carries the pragma.
 * .note = named `emit` to match the other three copies of this one-liner (and the word the briefs
 *   and the `#17` handoff both use). one operation, one word — a second name for it would read as a
 *   second operation (`rule.require.ubiqlang`).
 */
const emit = (schema: z.ZodType<any, any>): Record<string, any> =>
  z.toJSONSchema(schema, { io: 'input' });

/** .what = read the `x-domain-object-ref` pragma off a json-schema node (undefined when absent) */
const readRefPragma = (
  node: Record<string, any> | undefined,
): DomainObjectPragmaRef | undefined => node?.['x-domain-object-ref'];

/**
 * .what = reconstruct a reference from a live instance, driven ONLY by the pragma's `by`
 * .why = proves the pragma alone carries enough for a consumer to pick the correct runtime ref op —
 *   the exact decision the codegen makes when it emits `RefByPrimary` vs `RefByUnique`
 */
const reconstructRefByPragma = (
  pragma: DomainObjectPragmaRef,
  instance: any,
): Record<string, any> => {
  if (pragma.by === 'primary') return refByPrimary(instance);
  if (pragma.by === 'unique') return refByUnique(instance);
  throw new Error(`unexpected ref grain: ${pragma.by}`);
};

describe('getContractRef roundtrip (acceptance)', () => {
  given(
    "the vision's day-in-the-life: svc-surf publishes a SurfTrophy that references two dobjs by key",
    () => {
      interface Seaturtle {
        uuid?: string;
        seawaterSecurityNumber: string;
        name: string;
      }
      class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
        public static primary = ['uuid'] as const;
        public static unique = ['seawaterSecurityNumber'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          seawaterSecurityNumber: z.string(),
          name: z.string(),
        });
      }

      interface Surfboard {
        brand: string;
        length: number;
      }
      class Surfboard extends DomainEntity<Surfboard> implements Surfboard {
        public static unique = ['brand', 'length'] as const;
        public static schema = z.object({
          brand: z.string(),
          length: z.number(),
        });
      }

      interface SurfTrophy {
        uuid?: string;
        rider: { uuid: string };
        board: { brand: string; length: number };
        champion: Seaturtle;
      }
      class SurfTrophy extends DomainEntity<SurfTrophy> implements SurfTrophy {
        public static primary = ['uuid'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          // rider REFERENCES a Seaturtle by primary — just { uuid }
          rider: Seaturtle.contract().ref('primary'),
          // board REFERENCES a Surfboard by unique — { brand, length }
          board: Surfboard.contract().ref('unique'),
          // champion COMPOSES the whole Seaturtle — full identity, for contrast
          champion: Seaturtle.contract(),
        });
      }

      // the consumer's local class registry, keyed by the `of` a pragma names — the same map the
      // codegen holds when it binds `RefByPrimary<typeof SvcSurfSeaturtle>` back to a captured class
      const registry: Record<string, any> = { Seaturtle, Surfboard };

      when(
        'the author publishes the contract as json-schema (the wire)',
        () => {
          const wire: Record<string, any> = emit(SurfTrophy.contract());

          then(
            'each reference field carries its own distinct x-domain-object-ref, whole-compose field carries x-domain-object',
            () => {
              expect(wire.properties.rider['x-domain-object-ref']).toEqual({
                of: 'Seaturtle',
                by: 'primary',
              });
              expect(wire.properties.board['x-domain-object-ref']).toEqual({
                of: 'Surfboard',
                by: 'unique',
              });
              // champion is a full compose, NOT a reference — it carries x-domain-object, not the -ref
              expect(wire.properties.champion['x-domain-object'].name).toEqual(
                'Seaturtle',
              );
              expect(
                wire.properties.champion['x-domain-object-ref'],
              ).toBeUndefined();
            },
          );

          then('the whole published wire artifact matches snapshot', () => {
            expect(wire).toMatchSnapshot();
          });
        },
      );

      when('the consumer reads the wire back', () => {
        const wire: Record<string, any> = emit(SurfTrophy.contract());
        const pragmas = {
          rider: readRefPragma(wire.properties.rider),
          board: readRefPragma(wire.properties.board),
          champion: readRefPragma(wire.properties.champion),
        };

        then('each reference field yields its { of, by } pragma', () => {
          expect(pragmas.rider).toEqual({ of: 'Seaturtle', by: 'primary' });
          expect(pragmas.board).toEqual({ of: 'Surfboard', by: 'unique' });
          // the whole-compose field is not a reference — no ref pragma to read
          expect(pragmas.champion).toBeUndefined();
        });

        then(
          'the pragma names a class the consumer binds from its registry',
          () => {
            // `of` alone lets the consumer pick the local class — the bind the codegen depends on
            expect(registry[pragmas.rider!.of]).toBe(Seaturtle);
            expect(registry[pragmas.board!.of]).toBe(Surfboard);
          },
        );

        then('the extracted pragma map matches snapshot', () => {
          expect(pragmas).toMatchSnapshot();
        });
      });

      when(
        'the consumer reconstructs each reference from a live instance (the roundtrip)',
        () => {
          const wire: Record<string, any> = emit(SurfTrophy.contract());

          // upstream owns live instances; the consumer reduces them to refs, pragma-driven
          const riderInstance = new Seaturtle({
            uuid: 'turtle-1',
            seawaterSecurityNumber: '821',
            name: 'Squirt',
          });
          const boardInstance = new Surfboard({
            brand: 'Firewire',
            length: 68,
          });

          const riderRef = reconstructRefByPragma(
            readRefPragma(wire.properties.rider)!,
            riderInstance,
          );
          const boardRef = reconstructRefByPragma(
            readRefPragma(wire.properties.board)!,
            boardInstance,
          );

          then(
            'the reconstructed ref equals the runtime refBy* value (pragma drove the right op)',
            () => {
              expect(riderRef).toEqual(refByPrimary(riderInstance));
              expect(boardRef).toEqual(refByUnique(boardInstance));
              // and each is exactly the key-only shape — the reference, not the whole dobj
              expect(riderRef).toEqual({ uuid: 'turtle-1' });
              expect(boardRef).toEqual({ brand: 'Firewire', length: 68 });
            },
          );

          then(
            'the reconstructed ref validates against the published ref schema (wire accepts runtime value)',
            () => {
              // the ref schema the author published parses exactly what the runtime ref op produces —
              // no drift between the wire contract and the value that rides it
              expect(() =>
                Seaturtle.contract().ref('primary').parse(riderRef),
              ).not.toThrow();
              expect(() =>
                Surfboard.contract().ref('unique').parse(boardRef),
              ).not.toThrow();
            },
          );

          then('the reconstructed references match snapshot', () => {
            expect({ riderRef, boardRef }).toMatchSnapshot();
          });
        },
      );

      when(
        'a full composed payload crosses the wire and validates against the contract',
        () => {
          // a payload shaped exactly as the wire promises: two key-only references + one whole compose
          const payload = {
            uuid: 'trophy-1',
            rider: { uuid: 'turtle-1' },
            board: { brand: 'Firewire', length: 68 },
            champion: {
              uuid: 'turtle-9',
              seawaterSecurityNumber: '999',
              name: 'Crush',
            },
          };

          then(
            'the whole composed contract parses the payload INTO instances — refs stay plain',
            () => {
              const parsed = SurfTrophy.contract().parse(payload);

              // the props survive intact
              expect(parsed).toEqual(payload);

              // ...and the composed positions are live dobjs, while the ref positions are not.
              // that split is the whole point: a ref names a dobj, a compose IS one.
              expect(parsed).toBeInstanceOf(SurfTrophy);
              expect(parsed.champion).toBeInstanceOf(Seaturtle);
              expect(parsed.rider).not.toBeInstanceOf(Seaturtle);
              expect(parsed.board).not.toBeInstanceOf(Surfboard);
            },
          );

          then(
            'the HYDRATED value matches snapshot (a runtime value, not a wire document)',
            () => {
              // ⚠️ this snapshot opens `SurfTrophy {`, not `{`, and the prefix is the POINT rather
              // than a blemish: jest prints a constructor name, so the diff shows which positions
              // hydrated and which stayed plain — `SurfTrophy {` and `champion: Seaturtle {` are
              // coerced `.contract()` positions, while `rider` and `board` are `.ref()` picks and
              // correctly stay plain objects. no pure-json snapshot can carry that distinction, and
              // it is the clearest proof of the feature a reviewer can read without a run.
              //
              // ⭐ the two snapshot KINDS in this file are deliberately different, and each is
              // internally consistent (`rule.forbid.snapshot-visual-blemishes` asks for consistency
              // across *similar* outputs, and these two are not similar):
              //   - a HYDRATED value  → a runtime object; constructor names carry the guarantee
              //   - a PUBLISHED wire  → a json document; pure json, no prefix anywhere
              // the labels now say which is which, so the two are not mistaken for one format
              // applied inconsistently — which is exactly how a peer lens first read them.
              expect(SurfTrophy.contract().parse(payload)).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given(
    'a contract with an ARRAY of references (a heat rosters many riders by key)',
    () => {
      // a common composition: a field that references MANY dobjs by key, not one. the ref schema
      // embeds as the array item, so the x-domain-object-ref pragma must ride on `items` of the
      // json-schema array — a consumer walks `properties.<field>.items` to find the ref.
      interface Seaturtle {
        uuid?: string;
        name: string;
      }
      class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
        public static primary = ['uuid'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          name: z.string(),
        });
      }

      interface Heat {
        uuid?: string;
        riders: { uuid: string }[];
      }
      class Heat extends DomainEntity<Heat> implements Heat {
        public static primary = ['uuid'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          // an ARRAY of references — each item points at a Seaturtle by primary
          riders: z.array(Seaturtle.contract().ref('primary')),
        });
      }

      const registry: Record<string, any> = { Seaturtle };

      when('the roster contract is published as json-schema', () => {
        const wire: Record<string, any> = emit(Heat.contract());

        then(
          'the ref pragma rides on the array items, not the array node itself',
          () => {
            // the array node carries no ref pragma; its `items` schema carries the reference
            expect(wire.properties.riders.type).toEqual('array');
            expect(
              wire.properties.riders['x-domain-object-ref'],
            ).toBeUndefined();
            expect(wire.properties.riders.items['x-domain-object-ref']).toEqual(
              {
                of: 'Seaturtle',
                by: 'primary',
              },
            );
          },
        );

        then('the whole published array-of-refs wire matches snapshot', () => {
          expect(wire).toMatchSnapshot();
        });
      });

      when(
        'the consumer reconstructs the whole roster from live riders',
        () => {
          const wire: Record<string, any> = emit(Heat.contract());
          const pragma = readRefPragma(wire.properties.riders.items)!;

          // upstream owns a roster of live turtles; the consumer reduces each to its ref, pragma-driven
          const riders = [
            new Seaturtle({ uuid: 'turtle-1', name: 'Squirt' }),
            new Seaturtle({ uuid: 'turtle-2', name: 'Crush' }),
            new Seaturtle({ uuid: 'turtle-3', name: 'Nemo' }),
          ];
          const riderRefs = riders.map((rider) =>
            reconstructRefByPragma(pragma, rider),
          );

          then(
            'each reconstructed ref is the key-only shape (the roster of pointers)',
            () => {
              expect(riderRefs).toEqual([
                { uuid: 'turtle-1' },
                { uuid: 'turtle-2' },
                { uuid: 'turtle-3' },
              ]);
            },
          );

          then(
            'the whole array of reconstructed refs validates against the published array contract',
            () => {
              // the array ref contract parses exactly the array of runtime refs — no drift, at scale
              expect(() =>
                z.array(Seaturtle.contract().ref('primary')).parse(riderRefs),
              ).not.toThrow();
            },
          );

          then(
            'the consumer binds the item pragma to a class from its registry',
            () => {
              expect(registry[pragma.of]).toBe(Seaturtle);
            },
          );

          then('the reconstructed roster of refs matches snapshot', () => {
            expect(riderRefs).toMatchSnapshot();
          });
        },
      );

      when('a full roster payload crosses the wire', () => {
        const payload = {
          uuid: 'heat-1',
          riders: [{ uuid: 'turtle-1' }, { uuid: 'turtle-2' }],
        };

        then(
          'the array-of-refs contract parses the roster INTO a Heat, refs stay plain',
          () => {
            const parsed = Heat.contract().parse(payload);

            expect(parsed).toEqual(payload);

            // the root composes, so it hydrates; every array ITEM is a ref, so none does
            expect(parsed).toBeInstanceOf(Heat);
            for (const rider of parsed.riders)
              expect(rider).not.toBeInstanceOf(Seaturtle);
          },
        );

        then(
          'the HYDRATED roster matches snapshot (a runtime value, not a wire document)',
          () => {
            // `Heat {` at the root and plain `{` for every array item — the prefix asymmetry IS
            // the assertion: the root composes, so it hydrates; each item is a `.ref()`, so none
            // does. see the twin note above for why the two snapshot kinds in this file differ.
            expect(Heat.contract().parse(payload)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    'a reference whose unique key is itself a nested dobj (recursion crosses the wire)',
    () => {
      interface Seaturtle {
        uuid?: string;
        seawaterSecurityNumber: string;
      }
      class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
        public static primary = ['uuid'] as const;
        public static unique = ['seawaterSecurityNumber'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          seawaterSecurityNumber: z.string(),
        });
      }

      interface SeaturtleShell {
        uuid?: string;
        turtle: Seaturtle;
      }
      class SeaturtleShell
        extends DomainEntity<SeaturtleShell>
        implements SeaturtleShell
      {
        public static primary = ['uuid'] as const;
        public static unique = ['turtle'] as const;
        public static nested = { turtle: Seaturtle };
        public static schema = z.object({
          uuid: z.string().optional(),
          turtle: z.object({
            uuid: z.string().optional(),
            seawaterSecurityNumber: z.string(),
          }),
        });
      }

      when('the shell ref is published and read back', () => {
        const wire: Record<string, any> = emit(
          SeaturtleShell.contract().ref('unique'),
        );

        then(
          'the top pragma references the shell, the nested field carries its own ref pragma',
          () => {
            expect(wire['x-domain-object-ref']).toEqual({
              of: 'SeaturtleShell',
              by: 'unique',
            });
            // the nested turtle key reduced to ITS own unique ref — recursion survives the wire
            expect(wire.properties.turtle['x-domain-object-ref']).toEqual({
              of: 'Seaturtle',
              by: 'unique',
            });
          },
        );

        then('the published nested-ref wire matches snapshot', () => {
          expect(wire).toMatchSnapshot();
        });
      });

      when(
        'the consumer reconstructs the nested reference from a live shell',
        () => {
          const shell = new SeaturtleShell({
            turtle: new Seaturtle({ seawaterSecurityNumber: '821' }),
          });
          const shellRef = refByUnique<typeof SeaturtleShell>(shell);

          then(
            'the runtime ref nests the turtle key ref (matches the recursive wire shape)',
            () => {
              expect(shellRef).toEqual({
                turtle: { seawaterSecurityNumber: '821' },
              });
            },
          );

          then(
            'the reconstructed nested ref validates against the published ref schema',
            () => {
              expect(() =>
                SeaturtleShell.contract().ref('unique').parse(shellRef),
              ).not.toThrow();
            },
          );

          then('the reconstructed nested reference matches snapshot', () => {
            expect(shellRef).toMatchSnapshot();
          });
        },
      );
    },
  );

  given(
    'a reference by the ref-union grain (either key satisfies the contract)',
    () => {
      interface Sponsor {
        uuid?: string;
        handle: string;
      }
      class Sponsor extends DomainEntity<Sponsor> implements Sponsor {
        public static primary = ['uuid'] as const;
        public static unique = ['handle'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          handle: z.string(),
        });
      }

      when('the ref-union is published and read back', () => {
        const wire: Record<string, any> = emit(Sponsor.contract().ref());

        then(
          'the wire is a union (anyOf) stamped once at the top with by:"ref"',
          () => {
            expect(wire['x-domain-object-ref']).toEqual({
              of: 'Sponsor',
              by: 'ref',
            });
            expect(wire.anyOf).toBeDefined();
            expect(wire.anyOf.length).toEqual(2);
          },
        );

        then('the published union wire matches snapshot', () => {
          expect(wire).toMatchSnapshot();
        });
      });

      when(
        'the consumer reconstructs by either grain from one live sponsor',
        () => {
          const sponsor = new Sponsor({ uuid: 's-1', handle: '@acme' });
          const primaryRef = refByPrimary<typeof Sponsor>(sponsor);
          const uniqueRef = refByUnique<typeof Sponsor>(sponsor);

          then(
            'both a primary-shaped and a unique-shaped ref validate against the union contract',
            () => {
              // the union accepts either grain — the by:"ref" promise, proven both ways.
              // ⚠️ asserted on the parsed VALUE, not merely `.not.toThrow()`: q24 was a defect where
              // the parse SUCCEEDED and handed back `{}`, so a throw was never the symptom. a clamp
              // that asserts the absence of the wrong signal reads as coverage of the case it walks
              // past — the lesson this suite's own p24/p26 repairs were written from.
              expect(Sponsor.contract().ref().parse(primaryRef)).toEqual({
                uuid: 's-1',
              });
              expect(Sponsor.contract().ref().parse(uniqueRef)).toEqual({
                handle: '@acme',
              });
            },
          );

          then('both reconstructed grains match snapshot', () => {
            expect({ primaryRef, uniqueRef }).toMatchSnapshot();
          });
        },
      );

      when('a caller supplies only the UNIQUE key (the q24 fallback)', () => {
        // ⭐ raised to acceptance grain on a converged read from BOTH l3 lenses. this is the shape
        // that was the single blocker-severity defect of the whole feature (i005/i010 → i011):
        // `Sponsor.primary` is `uuid`, declared `.optional()` in the schema, so before the
        // `.required()` fix the primary arm succeeded VACUOUSLY on a payload with no uuid — the
        // union never reached the unique arm, and a reference that named a real sponsor came back
        // as `{}`. a success, with the key destroyed.
        //
        // it is exhaustively covered at unit grain (`getContractRef.matrix.test.ts`, tables A/B).
        // it belongs here too because the readme promises this behavior to a consumer in prose
        // (*"a reference that names no key is not a reference"*), and the snapshot-diff flow is
        // what a reviewer actually reads.

        then('⭐ the union FALLS BACK to the unique arm — never `{}`', () => {
          const parsed = Sponsor.contract().ref().parse({ handle: '@acme' });
          // the assertion that bites: `toEqual({})` is what the defect produced, and `toBeDefined()`
          // or a `.not.toThrow()` would have passed under it
          expect(parsed).toEqual({ handle: '@acme' });
        });

        then('the narrow primary grain REFUSES the same payload', () => {
          // the negative control for the fallback: had `.required()` been lost, this arm would
          // accept `{}` and the fallback above would silently stop.
          //
          // ⛔ asserted on `safeParse().success`, NOT on `expect(getError(…)).toBeDefined()` — that
          // form is a failhide, and it slipped into this very clamp on first write. `getError`
          // returns a `NoErrorThrownError` when the subject does NOT throw, and that IS an `Error`
          // instance, so `.toBeDefined()` / `.toBeInstanceOf(Error)` pass in BOTH directions.
          // measured, then rewritten: with `.required()` reverted this arm genuinely succeeds and
          // hands back `{}`, and the `getError` form stayed green through it.
          // a `getError` clamp must assert the error's CLASS or MESSAGE (as every other clamp in
          // this repo does) — or, as here, sidestep the throw channel entirely.
          const result = Sponsor.contract()
            .ref('primary')
            .safeParse({ handle: '@acme' });
          expect(result.success).toEqual(false);
        });

        then('a payload with NEITHER key is refused outright', () => {
          // the third row: a vacuous success is impossible in both directions
          const result = Sponsor.contract()
            .ref()
            .safeParse({ nickname: 'acme' });
          expect(result.success).toEqual(false);
        });

        then('the fallback ref matches snapshot', () => {
          expect(
            Sponsor.contract().ref().parse({ handle: '@acme' }),
          ).toMatchSnapshot();
        });
      });
    },
  );
});
