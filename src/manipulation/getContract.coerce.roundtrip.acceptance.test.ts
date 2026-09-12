import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

// acceptance tests are blackbox: reach the deliverable through the PUBLIC barrel only, exactly as a
// cross-service consumer (sdk-aws-lambda) would — never an internal file path
import {
  type ContractOf,
  DomainEntity,
  DomainLiteral,
  type DomainObjectContract,
  type DomainObjectPragma,
} from '@src/index';

/**
 * .what = the coerce journey `.contract()` exists to enable, end to end and through the public
 *   barrel alone: a caller sends plain wire json at a service boundary, the boundary hands the
 *   handler LIVE dobj instances all the way down, and the same one declaration also publishes the
 *   wire contract a downstream codegen reads.
 * .why =
 *   - `rule.require.test-coverage-by-grain` puts a **contract** grain at acceptance + snapshot, and
 *     `X.contract()` IS the contract grain — it is the boundary itself. the extant acceptance suite
 *     covers `.ref` (a reference), so the headline case — a **composed** dobj, coerced — had no
 *     acceptance-grain proof at all; every clamp on it was unit-grain, reached by internal paths.
 *   - the unit clamps prove each property in isolation. this proves the properties hold **together**
 *     on one payload, through the barrel, in the shape the vision's day-in-the-life describes: a
 *     multi-field payload with a nested dobj, an array, and a null, which replaces the hand-rebuild
 *     block the wish set out to delete.
 * .note = every emit passes `{ io: 'input' }`, unconditionally and at every border. `io` names the
 *   SIDE of the contract, never the BORDER of the endpoint — see the emit helper's own note.
 */

/**
 * .what = emit a contract as json-schema, on the input face
 * .why = `{ io: 'input' }` unconditionally, at every emit and at every border — the one line an sdk
 *   owes its emit helper. a `.contract()` coerces, so its OUT face is a live class instance, which
 *   json-schema cannot represent; the IN face is also the only one that carries the pragma.
 * .note = named `emit` to match the other copies of this one-liner (and the word the briefs and the
 *   `#17` handoff both use). one operation, one word (`rule.require.ubiqlang`).
 */
const emit = (schema: z.ZodType<any, any>): Record<string, any> =>
  z.toJSONSchema(schema, { io: 'input' });

/** .what = read the `x-domain-object` pragma off a json-schema node (undefined when absent) */
const readPragma = (
  node: Record<string, any> | undefined,
): DomainObjectPragma | undefined => node?.['x-domain-object'];

describe('getContract coerce roundtrip (acceptance)', () => {
  given(
    "the vision's day-in-the-life: a lambda books a surf lesson from plain wire json",
    () => {
      // ---- the dobjs a service author declares — note they add NO opt-in line ------------------
      interface Fin {
        setup: 'thruster' | 'quad';
      }
      class Fin extends DomainLiteral<Fin> implements Fin {
        public static schema = z.object({
          setup: z.enum(['thruster', 'quad']),
        });
      }

      interface Surfboard {
        brand: string;
        lengthInInches: number;
        fin: Fin;
      }
      class Surfboard extends DomainLiteral<Surfboard> implements Surfboard {
        public static nested = { fin: Fin };
        public static schema = z.object({
          brand: z.string(),
          lengthInInches: z.number(),
          fin: Fin.contract(),
        });
      }

      interface Surfer {
        uuid?: string;
        name: string;
        board: Surfboard;
        spares: Surfboard[];
        sponsor: Surfboard | null;
      }
      class Surfer extends DomainEntity<Surfer> implements Surfer {
        public static primary = ['uuid'] as const;
        public static unique = ['name'] as const;
        public static nested = {
          board: Surfboard,
          spares: Surfboard,
          sponsor: Surfboard,
        };
        public static schema = z.object({
          uuid: z.string().optional(),
          name: z.string(),
          board: Surfboard.contract(),
          spares: z.array(Surfboard.contract()),
          sponsor: Surfboard.contract().nullable(),
        });
      }

      // ---- the endpoint the author declares: BOTH borders, one declaration each ----------------
      const endpoint = {
        input: z.object({ surfer: Surfer.contract() }),
        output: z.object({ booked: Surfer.contract() }),
      };

      // ---- what a caller actually sends: plain json, no classes, no ceremony -------------------
      const wire = {
        surfer: {
          uuid: 'surfer-1',
          name: 'kai',
          board: {
            brand: 'Firewire',
            lengthInInches: 68,
            fin: { setup: 'thruster' },
          },
          spares: [
            {
              brand: 'Channel Islands',
              lengthInInches: 61,
              fin: { setup: 'quad' },
            },
          ],
          sponsor: null,
        },
      };

      when('a downstream consumer names the surface in its own types', () => {
        then('⭐ both new public types are reachable from the barrel', () => {
          // ⚠️ this is a TYPE clamp with a runtime body only so jest has a case to run.
          // `index.test.ts` documents the house convention: a public *type* export vanishes from
          // the runtime snapshot, so the only clamp that goes red when one is dropped from the
          // barrel is a `tsc` on a test that imports it from `@src/index`. `DomainObjectPragma`
          // already followed it (see `readPragma` above); the two types THIS feature adds —
          // `ContractOf` and `DomainObjectContract` — did not, so a dropped export would have
          // surfaced first in a downstream consumer's build rather than in ours.
          const boundary: ContractOf<typeof Surfer> = Surfer.contract();
          const surface: DomainObjectContract = Surfer.contract;

          expect(boundary).toBeInstanceOf(z.ZodType);
          expect(typeof surface).toEqual('function');
        });
      });

      when('the boundary parses the request', () => {
        const event = endpoint.input.parse(wire);

        then('the handler receives LIVE instances, three levels down', () => {
          // the whole point: no `new Surfer(...)`, no `.map(b => new Surfboard(b))`, no ternary
          expect(event.surfer).toBeInstanceOf(Surfer);
          expect(event.surfer.board).toBeInstanceOf(Surfboard);
          expect(event.surfer.board.fin).toBeInstanceOf(Fin); // ⭐ level 3
          expect(event.surfer.spares[0]).toBeInstanceOf(Surfboard);
          expect(event.surfer.spares[0]!.fin).toBeInstanceOf(Fin);
        });

        then('a null stays null, and an array keeps its arity', () => {
          expect(event.surfer.sponsor).toEqual(null);
          expect(event.surfer.spares).toHaveLength(1);
        });

        then('every level is BUILT — each carries .clone', () => {
          // `.build` rather than `new`, so the root is as rich as its nested values already were
          expect(typeof event.surfer.clone).toEqual('function');
          // ⚠️ asserted by property name rather than a typed access: only the ROOT's declared type
          // is `WithImmute<X>`. a nested field's type comes from the author's own interface
          // (`board: Surfboard`), which this lib cannot rewrite — so `.clone` is present at runtime
          // and absent from the declared type. inherent to the declaration, not a defect here.
          expect(event.surfer.board).toHaveProperty('clone');
          expect(event.surfer.board.fin).toHaveProperty('clone');
        });
      });

      when('the same declaration is asked to DESCRIBE the boundary', () => {
        then('both borders emit under { io: input }, pragma intact', () => {
          // ⚠️ the trap this clamps: `{ io: 'output' }` on the OUTPUT border reads natural and is
          // wrong. `io` names the SIDE of the contract (wire vs instance), never the BORDER of the
          // endpoint (request vs response). both borders publish their WIRE shape.
          const emitInput = emit(endpoint.input);
          const emitOutput = emit(endpoint.output);

          expect(readPragma(emitInput.properties.surfer)?.name).toEqual(
            'Surfer',
          );
          expect(readPragma(emitOutput.properties.booked)?.name).toEqual(
            'Surfer',
          );
        });

        then(
          'the pragma carries what a codegen needs to rebuild the class',
          () => {
            const pragma = readPragma(emit(endpoint.input).properties.surfer)!;
            expect(pragma.kind).toEqual('entity');
            expect(pragma.primary).toEqual(['uuid']);
            expect(pragma.unique).toEqual(['name']);
            expect(pragma.nested).toEqual({
              board: 'Surfboard',
              spares: 'Surfboard',
              sponsor: 'Surfboard',
            });
          },
        );

        then(
          'the published wire contract is the plain shape, snapshotted',
          () => {
            // the snapshot is what makes a change to the PUBLISHED contract visible in a pr diff —
            // this document is what a downstream service generates its client from
            expect(emit(endpoint.input)).toMatchSnapshot();
          },
        );

        then('the emitted document describes json, never the class', () => {
          const emitted = emit(endpoint.input);
          expect(emitted.properties.surfer.type).toEqual('object');
          // the caller sends a plain board, not a Surfboard instance
          expect(emitted.properties.surfer.properties.board.type).toEqual(
            'object',
          );
        });
      });

      when('the response border hands a dobj back', () => {
        then('c15 — a re-parse of a live instance is idempotent', () => {
          // this repo ships a `.transform()`, not a `z.codec`, so there is no `z.encode` — a
          // consumer uses `.parse` at BOTH borders. that is safe only because decode converges:
          // an already-rich value parses to an equal value rather than corrupts.
          const event = endpoint.input.parse(wire);
          const response = endpoint.output.parse({ booked: event.surfer });

          expect(response.booked).toBeInstanceOf(Surfer);
          expect(response.booked.board.fin).toBeInstanceOf(Fin);
          // and the wire bytes are identical either way — an added method is a function, and
          // JSON.stringify skips functions, so the rich form is wire-equivalent
          expect(JSON.parse(JSON.stringify(response.booked))).toEqual(
            wire.surfer,
          );
        });

        then(
          '⛔ and `z.encode` is genuinely UNAVAILABLE, not merely unused',
          () => {
            // ⭐ the fact the whole `.parse`-at-both-borders convention rests on, clamped rather than
            // asserted in prose. this lib declares zod as a devDependency and imports it `import type`
            // only, so `z.codec` — which needs a VALUE import — is out of reach; what is reachable
            // from the author's own schema instance is `.transform()`, and a transform has no
            // backward direction. a consumer who arrives from zod's codec docs and reaches for
            // `z.encode` meets a native zod throw, so the limit belongs in a test and in the readme.
            // ⚠️ this clamp is also the tripwire for a later swap to `z.codec`: that swap would only
            // ADD `z.encode`, so it turns this `then` red — deliberately, as the signal to update the
            // readme and this test together rather than let the docs drift behind the surface.
            const event = endpoint.input.parse(wire);
            const error = getError(() =>
              z.encode(endpoint.output as any, { booked: event.surfer }),
            );
            expect(error.constructor.name).toEqual('$ZodEncodeError');
          },
        );
      });

      when('the caller sends a payload the boundary cannot accept', () => {
        then('a schema miss is an ordinary zod issue on the field path', () => {
          const result = endpoint.input.safeParse({
            surfer: { ...wire.surfer, name: 42 },
          });
          expect(result.success).toEqual(false);
          expect(result.error!.issues[0]!.path).toEqual(['surfer', 'name']);
        });

        then('c9 — a nested ctor failure is CONTAINED, never a throw', () => {
          // the reachable path: the parent accepts the payload and the nested dobj rejects it. a
          // throw here would skip the caller's `if (!result.success)` branch entirely, which is
          // the failure mode the guard exists to remove.
          const bad = {
            surfer: {
              ...wire.surfer,
              board: { ...wire.surfer.board, fin: { setup: 'twin' } },
            },
          };
          const result = endpoint.input.safeParse(bad);
          expect(result.success).toEqual(false);
          expect(() => endpoint.input.safeParse(bad)).not.toThrow();
        });

        then(
          'an emit that forgets the flag fails LOUD, never silently wrong',
          () => {
            // zod's default `io` is `'output'`, which asks what a parse hands back — a live class,
            // which is not json. the throw is accurate: better a loud stop than a wrong document
            // published to every downstream consumer.
            const error = getError(() => z.toJSONSchema(endpoint.input));
            expect(error.message).toContain('JSON Schema');
            // ⭐ pinned, because this text is **zod's** and not ours. it is the one failure on this
            // whole surface whose words we cannot author — the vision's §8 weakest seam, and the
            // exact hazard `sdk-aws-lambda#17` exists to guard. a fragment match survives a reword
            // into text that guides less; a snapshot puts the change in a pr diff, where the readme
            // and the `#17` handoff can be re-read against the new text before it reaches adopters.
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('a TREE-shaped dobj at a boundary, reached through the barrel', () => {
    // ⚠️ the one domain shape this surface makes awkward, raised to acceptance grain because BOTH
    // contractual concerns behave differently here than anywhere else: the instantiation half needs
    // `z.lazy` to exist at all, and the introspection half emits a `$ref` rather than an inline
    // object. `rule.require.test-coverage-by-grain` puts a contract at acceptance + snapshot, and a
    // recursive emit is precisely the document a downstream codegen is most likely to mishandle —
    // so the snapshot is the deliverable, not decoration.
    interface Thread {
      uuid?: string;
      text: string;
      replies: Thread[];
    }
    class Thread extends DomainEntity<Thread> implements Thread {
      public static primary = ['uuid'] as const;
      public static nested = { replies: Thread };
      public static schema = z.object({
        uuid: z.string().optional(),
        text: z.string(),
        // ⭐ `z.lazy` is REQUIRED here: a direct `Thread.contract()` would read `Thread.schema` while
        // its own initializer still runs, and fail. the error names this fix; this is that fix, in
        // the shape a consumer would actually write it
        replies: z.array(z.lazy(() => Thread.contract())),
      });
    }

    when('a caller sends a nested thread of plain wire json', () => {
      const wire = {
        text: 'anyone out at pipeline?',
        replies: [
          {
            text: 'head high, light offshore',
            replies: [{ text: 'on my way out now', replies: [] }],
          },
        ],
      };

      then('the handler receives live instances all the way down', () => {
        const out: any = Thread.contract().parse(wire);
        expect(out).toBeInstanceOf(Thread);
        expect(out.replies[0]).toBeInstanceOf(Thread);
        expect(out.replies[0].replies[0]).toBeInstanceOf(Thread);
        expect(out.replies[0].replies[0].text).toEqual('on my way out now');
        expect(typeof out.clone).toEqual('function');
      });

      then(
        'the published wire contract matches snapshot ($ref recursion)',
        () => {
          const json: Record<string, any> = z.toJSONSchema(Thread.contract(), {
            io: 'input',
          });
          // assert the deliverables concretely, then snapshot for visual review
          expect(json.properties.replies.items).toEqual({ $ref: '#' });
          const pragma = json['x-domain-object'] as DomainObjectPragma;
          expect(pragma.name).toEqual('Thread');
          expect(pragma.nested).toEqual({ replies: 'Thread' });
          expect(json).toMatchSnapshot();
        },
      );

      then('the wire bytes survive a decode + re-serialize, unchanged', () => {
        const out = Thread.contract().parse(wire);
        // a `.clone` is a function, so JSON.stringify skips it at every level — the property that
        // makes `.parse` safe at an output border (c15's companion), here through a recursion
        expect(JSON.parse(JSON.stringify(out))).toEqual(wire);
      });
    });
  });

  given('a dobj SUBCLASS at a boundary, reached through the barrel', () => {
    // the i013 nitpick: the subclass clamp lived at unit grain only, and
    // `rule.require.test-coverage-by-grain` puts a contract at acceptance + snapshot. raised here
    // rather than moved — the unit clamp proves the memo and the ctor identity in isolation; this
    // proves the PUBLISHED document names the subclass, which is what a downstream codegen reads
    // and the only half a snapshot can catch in a pr diff.
    interface Craft {
      uuid?: string;
      serial: string;
    }
    class Craft extends DomainEntity<Craft> implements Craft {
      public static primary = ['uuid'] as const;
      public static unique = ['serial'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        serial: z.string(),
      });
    }
    class Longboard extends Craft {}

    when('the subclass contract is published and parsed', () => {
      then('the emitted document names the SUBCLASS', () => {
        const json: Record<string, any> = z.toJSONSchema(Longboard.contract(), {
          io: 'input',
        });
        const pragma = json['x-domain-object'] as DomainObjectPragma;
        expect(pragma.name).toEqual('Longboard');
        // ⭐ the negative control: the parent must still publish its own name, so a shared-memo
        // regression (one document served to both classes) cannot pass this pair
        expect(
          (
            z.toJSONSchema(Craft.contract(), { io: 'input' })[
              'x-domain-object'
            ] as DomainObjectPragma
          ).name,
        ).toEqual('Craft');
        expect(json).toMatchSnapshot();
      });

      then('a parse hands back an instance of the SUBCLASS', () => {
        const out = Longboard.contract().parse({ serial: 'sn-9' });
        // `toBeInstanceOf(Longboard)` alone would pass even had `this` bound to the parent, since a
        // Longboard IS a Craft — the constructor identity is the check that discriminates
        expect(out.constructor.name).toEqual('Longboard');
      });
    });
  });

  given('a boundary that composes dobjs with a zod COMBINATOR', () => {
    // ⭐ raised to acceptance grain on a converged read from BOTH l3 lenses, and the argument that
    // earned it is the readme's own sentence: a `discriminatedUnion` ARM is the one shape in this
    // family where "the build succeeds and the emit is full; only real traffic hits the refusal."
    //
    // that makes it precisely the trap a PR-diff-visible snapshot is for. the unit clamps
    // (`getContract.coerce.test.ts`, `given('a coerced position inside a zod COMBINATOR')`) prove
    // each property in isolation; this proves the PUBLISHED document — the artifact a downstream
    // codegen actually consumes — carries a readable pragma at each combinator address, through the
    // public barrel, on one endpoint-shaped declaration.
    interface Fin {
      brand: string;
    }
    class Fin extends DomainLiteral<Fin> implements Fin {
      public static schema = z.object({ brand: z.string() });
    }

    interface Leash {
      length: number;
    }
    class Leash extends DomainLiteral<Leash> implements Leash {
      public static schema = z.object({ length: z.number() });
    }

    when(
      'the endpoint declares a union, a record, and a discriminated union',
      () => {
        const contract = z.object({
          // either kind of part may arrive — a plain union, so zod tries each arm
          part: z.union([Fin.contract(), Leash.contract()]),
          // a keyed bag of parts
          spares: z.record(z.string(), Fin.contract()),
          // a tagged choice, with the dobj as a FIELD of each arm (the supported shape)
          mount: z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('fin'), fin: Fin.contract() }),
            z.object({ kind: z.literal('leash'), leash: Leash.contract() }),
          ]),
        });

        then('instantiation — every position hydrates on one payload', () => {
          const out = contract.parse({
            part: { brand: 'Futures' },
            spares: { spare: { brand: 'FCS' } },
            mount: { kind: 'leash', leash: { length: 6 } },
          });
          expect(out.part).toBeInstanceOf(Fin);
          expect(out.spares.spare).toBeInstanceOf(Fin);
          expect((out.mount as any).leash).toBeInstanceOf(Leash);
        });

        then('introspection — the published document is snapshotted', () => {
          const json = emit(contract);
          // the addresses a codegen reads, asserted before the snapshot so a regression names itself
          // rather than merely diffs — each is the address the AUTHOR wrote the dobj at, which is
          // the property that distinguishes a combinator from a `.nullable()` relocation
          expect(json.properties.part.anyOf[0]['x-domain-object'].name).toEqual(
            'Fin',
          );
          expect(json.properties.part.anyOf[1]['x-domain-object'].name).toEqual(
            'Leash',
          );
          expect(
            json.properties.spares.additionalProperties['x-domain-object'].name,
          ).toEqual('Fin');
          expect(
            json.properties.mount.oneOf[0].properties.fin['x-domain-object']
              .name,
          ).toEqual('Fin');
          expect(json).toMatchSnapshot();
        });
      },
    );

    when('a consumer reaches for the ONE unsupported shape', () => {
      // ⛔ a bare dobj contract as a discriminatedUnion ARM. the readme documents this; here is the
      // proof that the documented behavior is the real one, at the grain a consumer meets it.
      const bad = (
        z.discriminatedUnion as unknown as (
          key: string,
          arms: unknown[],
        ) => z.ZodType<any, any>
      )('kind', [Fin.contract(), Leash.contract()]);

      then(
        '⚠️ the emit succeeds — the false green the readme cautions of',
        () => {
          // this assertion is the POINT of the pair: it demonstrates that an emit-only check passes,
          // which is why the parse clamp below is the one that carries the guarantee
          const json = emit(bad);
          expect(json.oneOf[0]['x-domain-object'].name).toEqual('Fin');
        },
      );

      then('but a real request refuses, and names the arm', () => {
        const error = getError(() => bad.parse({ brand: 'Futures' }));
        expect(error.message).toContain('discriminated union');
        expect(error.message).toContain('0');
      });

      then('and the supported shape is the fix the readme names', () => {
        // the ✅ half — a dobj as a FIELD of each arm, discriminator alongside. asserted here so the
        // readme's recommended fix is itself under test, rather than merely written down
        const good = z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('fin'), fin: Fin.contract() }),
          z.object({ kind: z.literal('leash'), leash: Leash.contract() }),
        ]);
        const out = good.parse({ kind: 'fin', fin: { brand: 'Futures' } });
        expect((out as any).fin).toBeInstanceOf(Fin);
      });
    });
  });
});
