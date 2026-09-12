import { ConstraintError } from 'helpful-errors';
import Joi from 'joi';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

// import the published type from the package barrel (not the internal file) so these
// conformance tests also verify the deliverable: the type is reachable from the public api
import type { DomainObjectPragmaRef } from '@src/index';
import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { DomainObject } from '@src/instantiation/DomainObject';
import { refByPrimary } from '@src/reference/refByPrimary';
import { refByUnique } from '@src/reference/refByUnique';

/**
 * .what = emits a schema's json-schema on the input face, the one face every emit uses
 * .why = `{ io: 'input' }` unconditionally, at every emit and at every border. a ref schema is a
 *   plain pick with no coerce, so both faces would emit — but the moment a `.contract()` sits in
 *   the same tree, the OUT face is a live class instance, which json-schema cannot represent.
 *   one flag, one place, no per-schema judgment.
 * .note = ⚠️ **the one visible consequence in the snapshots below: `additionalProperties: false` is
 *   absent.** it is emitted only on the OUT face, so the flag above drops it. it is NOT a weakened
 *   assertion — measured at `getContract.coerce.test.ts`, given *"the ONE key that differs between
 *   the two io faces"*: the two faces are byte-identical apart from that key, and an unknown key is
 *   **stripped, never rejected**, at both (zod's `z.object` strips by default, and always did).
 */
const emit = (schema: z.ZodType<any, any>): Record<string, any> =>
  z.toJSONSchema(schema, { io: 'input' });

/**
 * .what = reads the x-domain-object-ref pragma out of a stamped schema's json-schema
 * .why = the pragma carried through z.toJSONSchema() is the actual deliverable; assert on it
 */
const getRefPragma = (schema: z.ZodType<any, any>): Record<string, any> =>
  emit(schema)['x-domain-object-ref'];

describe('getContractRef (.contract().ref)', () => {
  given('a DomainEntity with primary + unique', () => {
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

    when('.contract().ref("primary") is requested', () => {
      then(
        'the pragma is { of, by: "primary" } and only primary fields remain',
        () => {
          const ref = Seaturtle.contract().ref('primary');
          // type the expected against the published DomainObjectPragmaRef, so a rename of
          // `of`/`by` in that type fails to compile here (runtime/type drift caught), the same
          // convention the .contract tests use with DomainObjectPragma (getContract.test.ts)
          const expected: DomainObjectPragmaRef = {
            of: 'Seaturtle',
            by: 'primary',
          };
          expect(getRefPragma(ref)).toEqual(expected);
          const json: Record<string, any> = emit(ref);
          expect(json.properties.uuid).toBeDefined();
          expect(json.properties.seawaterSecurityNumber).toBeUndefined();
          expect(json.properties.name).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });

    when('.contract().ref("unique") is requested', () => {
      then(
        'the pragma is { of, by: "unique" } and only unique fields remain',
        () => {
          const ref = Seaturtle.contract().ref('unique');
          const expected: DomainObjectPragmaRef = {
            of: 'Seaturtle',
            by: 'unique',
          };
          expect(getRefPragma(ref)).toEqual(expected);
          const json: Record<string, any> = emit(ref);
          expect(json.properties.seawaterSecurityNumber).toBeDefined();
          expect(json.properties.uuid).toBeUndefined();
          expect(json.properties.name).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });

    when('.contract().ref("ref") is requested', () => {
      then(
        'the pragma is { of, by: "ref" } and the schema is a union (anyOf)',
        () => {
          const ref = Seaturtle.contract().ref();
          const expected: DomainObjectPragmaRef = {
            of: 'Seaturtle',
            by: 'ref',
          };
          expect(getRefPragma(ref)).toEqual(expected);
          const json: Record<string, any> = emit(ref);
          expect(json.anyOf).toBeDefined();
          expect(json.anyOf.length).toEqual(2);
          expect(json).toMatchSnapshot();
        },
      );
    });

    when('.contract().ref is embedded as a field in a parent z.object', () => {
      // the wish's primary journey: z.object({ rider: X.contract().ref('primary') })
      then(
        'the pragma survives on the nested field of the parent json-schema',
        () => {
          const parent = z.object({
            rider: Seaturtle.contract().ref('primary'),
          });
          const json: Record<string, any> = emit(parent);
          expect(json.properties.rider['x-domain-object-ref']).toEqual({
            of: 'Seaturtle',
            by: 'primary',
          });
          expect(json).toMatchSnapshot();
        },
      );
    });

    when('the same ref is requested twice', () => {
      then('repeated access returns the same instance (idempotent)', () => {
        expect(Seaturtle.contract().ref('primary')).toBe(
          Seaturtle.contract().ref('primary'),
        );
        expect(Seaturtle.contract().ref('unique')).not.toBe(
          Seaturtle.contract().ref('primary'),
        );
      });
    });

    when('.contract() itself is inspected', () => {
      then(
        'it still carries x-domain-object and no .ref leaks to json-schema',
        () => {
          const json: Record<string, any> = emit(Seaturtle.contract());
          expect(json['x-domain-object'].name).toEqual('Seaturtle');
          expect(json['x-domain-object-ref']).toBeUndefined();
          expect(json.ref).toBeUndefined();
        },
      );
    });

    when('.contract() is chained with another zod op before .ref', () => {
      then(
        '.ref is dropped by the chain — documented caveat: call .ref on the raw contract',
        () => {
          // zod ops return a fresh schema without our `.ref`; this locks the (ungraceful) behavior
          // the DomainObjectContract doc warns about, so a refactor cannot silently regress it.
          //
          // ts half + js half in one line: `.ref` is absent from the chained schema's TYPE (a
          // compile error, pinned by @ts-expect-error) and absent at RUNTIME (undefined). this
          // proves both halves of the documented "TypeError in js, compile error in ts" caveat.
          // @ts-expect-error - .ref does not exist on the fresh schema a zod chain op returns
          expect(Seaturtle.contract().optional().ref).toBeUndefined();
          // the raw contract keeps .ref, so embed-then-chain is the supported order
          expect(typeof Seaturtle.contract().ref).toBe('function');
        },
      );
    });
  });

  given(
    "the vision's multi-ref parent: two distinct .contract().ref fields plus a .contract() compose on one schema",
    () => {
      // mirrors the vision's day-in-the-life SurfTrophy: one parent that references two DIFFERENT
      // dobjs by two different key kinds in a single schema, alongside one whole-dobj compose. proves
      // a consumer can walk several distinct ref pragmas (and a full pragma) side by side — the one
      // narrative scenario the per-field tests above prove only in isolation.
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

      when(
        'a parent z.object composes rider(ref primary) + board(ref unique) + shaper(contract)',
        () => {
          then(
            'each nested field carries its own distinct pragma, side by side',
            () => {
              const parent = z.object({
                rider: Seaturtle.contract().ref('primary'),
                board: Surfboard.contract().ref('unique'),
                shaper: Seaturtle.contract(),
              });
              const json: Record<string, any> = emit(parent);

              // ref-by-primary lands on rider
              expect(json.properties.rider['x-domain-object-ref']).toEqual({
                of: 'Seaturtle',
                by: 'primary',
              });
              // ref-by-unique lands on board (a distinct dobj + distinct key kind)
              expect(json.properties.board['x-domain-object-ref']).toEqual({
                of: 'Surfboard',
                by: 'unique',
              });
              // whole-dobj compose lands on shaper: x-domain-object, NOT the -ref pragma
              expect(json.properties.shaper['x-domain-object'].name).toEqual(
                'Seaturtle',
              );
              expect(
                json.properties.shaper['x-domain-object-ref'],
              ).toBeUndefined();

              expect(json).toMatchSnapshot();
            },
          );
        },
      );
    },
  );

  given('a DomainEntity with a (misconfigured) nested primary key', () => {
    // primary keys are flat identifiers (e.g. uuid) by convention — never nested dobjs. this is a
    // defensive guard for that misconfiguration: even if a nested primary is declared, the pick
    // stays flat (mirrors refByPrimary, which copies the raw field, never recurses). it also pins
    // the primary/unique asymmetry so a future "make primary recurse like unique" change fails here.
    interface Anchor {
      uuid?: string;
    }
    class Anchor extends DomainEntity<Anchor> implements Anchor {
      public static primary = ['uuid'] as const;
      public static unique = ['uuid'] as const;
      public static schema = z.object({ uuid: z.string().optional() });
    }
    interface Buoy {
      marker: Anchor;
    }
    class Buoy extends DomainEntity<Buoy> implements Buoy {
      public static primary = ['marker'] as const;
      public static schema = z.object({
        marker: z.object({ uuid: z.string().optional() }),
      });
    }
    // bind the nested dobj on the primary key
    (Buoy as any).nested = { marker: Anchor };

    when('.contract().ref("primary") is requested', () => {
      then(
        'the nested-dobj primary key stays a flat pick (no recursion into its own ref)',
        () => {
          const ref = Buoy.contract().ref('primary');
          expect(getRefPragma(ref)).toEqual({ of: 'Buoy', by: 'primary' });
          const json: Record<string, any> = emit(ref);
          // marker stays a flat embedded object; no nested x-domain-object-ref stamp
          expect(json.properties.marker).toBeDefined();
          expect(json.properties.marker['x-domain-object-ref']).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainEntity with a nested field but a scalar unique key', () => {
    interface Shelter {
      uuid?: string;
      capacity: number;
    }
    class Shelter extends DomainEntity<Shelter> implements Shelter {
      public static primary = ['uuid'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        capacity: z.number(),
      });
    }

    interface Cove {
      uuid?: string;
      name: string;
      shelter: Shelter;
    }
    class Cove extends DomainEntity<Cove> implements Cove {
      public static primary = ['uuid'] as const;
      // the unique key is the scalar `name`, NOT the nested `shelter`
      public static unique = ['name'] as const;
      public static nested = { shelter: Shelter };
      public static schema = z.object({
        uuid: z.string().optional(),
        name: z.string(),
        shelter: z.object({
          uuid: z.string().optional(),
          capacity: z.number(),
        }),
      });
    }

    when('.contract().ref("unique") is requested', () => {
      then(
        'the scalar unique key is a flat pick; the nested field is not pulled in',
        () => {
          const ref = Cove.contract().ref('unique');
          const json: Record<string, any> = emit(ref);
          expect(json['x-domain-object-ref']).toEqual({
            of: 'Cove',
            by: 'unique',
          });
          // only the scalar unique key `name` is picked; `shelter` (nested, not unique) is absent
          expect(json.properties.name).toBeDefined();
          expect(json.properties.shelter).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainEntity whose unique key is itself a nested dobj', () => {
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

    when('.contract().ref("unique") is requested', () => {
      then(
        'the nested-dobj key recurses to its own unique ref (matches refByUnique)',
        () => {
          const ref = SeaturtleShell.contract().ref('unique');
          const json: Record<string, any> = emit(ref);
          // top-level pragma references SeaturtleShell by unique
          expect(json['x-domain-object-ref']).toEqual({
            of: 'SeaturtleShell',
            by: 'unique',
          });
          // the nested turtle field is reduced to ITS own unique ref, not its full shape
          const turtle = json.properties.turtle;
          expect(turtle['x-domain-object-ref']).toEqual({
            of: 'Seaturtle',
            by: 'unique',
          });
          expect(turtle.properties.seawaterSecurityNumber).toBeDefined();
          expect(turtle.properties.uuid).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );

      then(
        'the nested turtle ref is the SAME instance as a direct Seaturtle.contract().ref("unique") (memoized)',
        () => {
          // the nested recursion goes through the shared memo, so the turtle sub-schema embedded in
          // SeaturtleShell's ref is the very instance a direct Seaturtle.contract().ref('unique') returns
          const shellRef = SeaturtleShell.contract().ref('unique') as any;
          expect(shellRef.shape.turtle).toBe(
            Seaturtle.contract().ref('unique'),
          );
        },
      );

      then(
        'the schema shape agrees with the runtime refByUnique value (no schema/runtime drift)',
        () => {
          // guard against drift between the two hand-synced graph walks (refByUnique over
          // instances, buildKeyContract over schemas): build a live instance, reduce it via the
          // RUNTIME op, and assert its key structure matches the SCHEMA sub-shape the contract
          // derives. this fails loud if either recursion condition is edited out of sync.
          const shell = new SeaturtleShell({
            turtle: new Seaturtle({ seawaterSecurityNumber: '821' }),
          });
          const runtimeRef = refByUnique<typeof SeaturtleShell>(shell);

          // runtime reduces the nested turtle to ITS own unique ref: { turtle: { seawater... } }
          expect(runtimeRef).toEqual({
            turtle: { seawaterSecurityNumber: '821' },
          });

          // the schema derives the SAME key structure: turtle → its unique sub-shape (one key)
          const json: Record<string, any> = emit(
            SeaturtleShell.contract().ref('unique'),
          );
          const schemaKeys = Object.keys(json.properties);
          const schemaTurtleKeys = Object.keys(
            json.properties.turtle.properties,
          );
          expect(schemaKeys).toEqual(Object.keys(runtimeRef));
          expect(schemaTurtleKeys).toEqual(Object.keys(runtimeRef.turtle));
        },
      );
    });
  });

  given('a DomainEntity whose unique key is a nested DomainLiteral', () => {
    // a DomainLiteral is identified by all its props, so it never declares `static unique`
    interface Address {
      street: string;
      postal: string;
    }
    class Address extends DomainLiteral<Address> implements Address {
      public static schema = z.object({
        street: z.string(),
        postal: z.string(),
      });
    }

    interface Property {
      uuid?: string;
      address: Address;
    }
    class Property extends DomainEntity<Property> implements Property {
      public static primary = ['uuid'] as const;
      public static unique = ['address'] as const;
      public static nested = { address: Address };
      public static schema = z.object({
        uuid: z.string().optional(),
        address: z.object({
          street: z.string(),
          postal: z.string(),
        }),
      });
    }

    when('.contract().ref("unique") is requested', () => {
      then(
        'it does NOT throw; the literal key embeds its whole schema flat (mirrors refByUnique)',
        () => {
          // refByUnique embeds the whole value when the nested dobj has no `static unique`;
          // the schema must mirror that — a flat embed, no recursion, no ConstraintError
          const ref = Property.contract().ref('unique');
          const json: Record<string, any> = emit(ref);
          expect(json['x-domain-object-ref']).toEqual({
            of: 'Property',
            by: 'unique',
          });
          const address = json.properties.address;
          // whole address embedded (both props), no nested ref stamp (no reduction)
          expect(address['x-domain-object-ref']).toBeUndefined();
          expect(address.properties.street).toBeDefined();
          expect(address.properties.postal).toBeDefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given(
    'a DomainEntity whose unique key is a polymorphic nested (array) dobj',
    () => {
      interface Fish {
        uuid?: string;
        species: string;
      }
      class Fish extends DomainEntity<Fish> implements Fish {
        public static primary = ['uuid'] as const;
        public static unique = ['species'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          species: z.string(),
        });
      }

      interface Shark {
        uuid?: string;
        species: string;
      }
      class Shark extends DomainEntity<Shark> implements Shark {
        public static primary = ['uuid'] as const;
        public static unique = ['species'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          species: z.string(),
        });
      }

      interface Reef {
        uuid?: string;
        resident: Fish | Shark;
      }
      class Reef extends DomainEntity<Reef> implements Reef {
        public static primary = ['uuid'] as const;
        public static unique = ['resident'] as const;
        // a polymorphic nested key: an array of dobj choices, not a single constructor
        public static nested = { resident: [Fish, Shark] };
        public static schema = z.object({
          uuid: z.string().optional(),
          resident: z.object({
            uuid: z.string().optional(),
            species: z.string(),
          }),
        });
      }

      when('.contract().ref("unique") is requested', () => {
        then(
          'it fails fast: a polymorphic unique key whose arms declare unique cannot derive one faithful shape',
          () => {
            // runtime refByUnique reduces the LIVE instance (Fish or Shark) to its own unique ref;
            // the schema cannot know the arm at build time, so a flat embed would silently drift
            // (vision q2). fail loud rather than lie (see getContractRef buildKeyContract).
            const error = getError(() => Reef.contract().ref('unique'));
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('polymorphic nested dobj');
            expect(error.message).toContain('Fish');
            expect(error.message).toContain('Shark');
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    'a DomainEntity whose unique key is a polymorphic nested dobj, no arm with unique',
    () => {
      interface Pebble {
        color: string;
      }
      class Pebble extends DomainLiteral<Pebble> implements Pebble {
        public static schema = z.object({ color: z.string() });
      }

      interface Grain {
        color: string;
      }
      class Grain extends DomainLiteral<Grain> implements Grain {
        public static schema = z.object({ color: z.string() });
      }

      interface Shore {
        uuid?: string;
        speck: Pebble | Grain;
      }
      class Shore extends DomainEntity<Shore> implements Shore {
        public static primary = ['uuid'] as const;
        public static unique = ['speck'] as const;
        // polymorphic nested key whose arms are DomainLiterals — neither declares `static unique`
        public static nested = { speck: [Pebble, Grain] };
        public static schema = z.object({
          uuid: z.string().optional(),
          speck: z.object({ color: z.string() }),
        });
      }

      when('.contract().ref("unique") is requested', () => {
        then(
          'the flat pick is kept (no throw): runtime embeds the whole value for every arm',
          () => {
            const ref = Shore.contract().ref('unique');
            const json: Record<string, any> = emit(ref);
            expect(json['x-domain-object-ref']).toEqual({
              of: 'Shore',
              by: 'unique',
            });
            // no arm declares unique, so a flat embed matches runtime for every arm — faithful
            const speck = json.properties.speck;
            expect(speck['x-domain-object-ref']).toBeUndefined();
            expect(speck.properties.color).toBeDefined();
            expect(json).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('a DomainEntity with only a primary (no unique)', () => {
    interface Sandbar {
      uuid?: string;
      latitude: number;
    }
    class Sandbar extends DomainEntity<Sandbar> implements Sandbar {
      public static primary = ['uuid'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        latitude: z.number(),
      });
    }

    when('.contract().ref("ref") is requested', () => {
      then(
        'the union-of-one degrades to the single primary shape, stamped by:"ref"',
        () => {
          const ref = Sandbar.contract().ref();
          expect(getRefPragma(ref)).toEqual({ of: 'Sandbar', by: 'ref' });
          const json: Record<string, any> = emit(ref);
          // no union: a single object, not an anyOf
          expect(json.anyOf).toBeUndefined();
          expect(json.properties.uuid).toBeDefined();
          expect(json.properties.latitude).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a self-referential unique-key graph (cyclic)', () => {
    interface Node {
      uuid?: string;
      parent: Node;
    }
    class Node extends DomainEntity<Node> implements Node {
      public static primary = ['uuid'] as const;
      public static unique = ['parent'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        parent: z.object({ uuid: z.string().optional() }),
      });
    }
    // bind the self-cycle after the class is defined
    (Node as any).nested = { parent: Node };

    when('.contract().ref("unique") is requested', () => {
      then('it fails fast with a cyclic-graph ConstraintError', () => {
        const error = getError(() => Node.contract().ref('unique'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cyclic unique-key graph');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainObject with no schema declared', () => {
    interface Driftwood {
      grain: string;
    }
    class Driftwood extends DomainObject<Driftwood> implements Driftwood {
      public static primary = ['grain'] as const;
    }

    when('.contract().ref is requested', () => {
      then('.contract() itself fails fast (no schema) before .ref', () => {
        const error = getError(() => Driftwood.contract().ref('primary'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires a static schema');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainObject whose schema is joi, not zod', () => {
    interface JoiSandbar {
      name: string;
    }
    class JoiSandbar extends DomainObject<JoiSandbar> implements JoiSandbar {
      public static primary = ['name'] as const;
      public static schema = Joi.object({ name: Joi.string() });
    }

    when('.contract().ref is requested', () => {
      then('.contract() itself fails fast (non-zod) before .ref', () => {
        const error = getError(() => JoiSandbar.contract().ref('primary'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires a zod schema');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainObject whose zod schema is not object-shaped', () => {
    interface Whistle {
      pitch: string;
    }
    class Whistle extends DomainObject<Whistle> implements Whistle {
      public static primary = ['pitch'] as const;
      // a non-object zod schema cannot be .pick()'d for key fields
      public static schema = z.string() as any;
    }

    when('.contract().ref is requested', () => {
      then('it fails fast with an object-schema ConstraintError', () => {
        const error = getError(() => Whistle.contract().ref('primary'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires an object schema');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainEntity that does not declare the requested key', () => {
    interface Ripple {
      uuid?: string;
    }
    class Ripple extends DomainEntity<Ripple> implements Ripple {
      public static primary = ['uuid'] as const;
      // no static unique declared
      public static schema = z.object({ uuid: z.string().optional() });
    }

    when(
      '.contract().ref("unique") is requested but no static unique exists',
      () => {
        then(
          'it fails fast with a requires-static-unique ConstraintError',
          () => {
            const error = getError(() => Ripple.contract().ref('unique'));
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('requires `static unique`');
            expect(error.message).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('a DomainEntity that declares unique but not primary', () => {
    interface Current {
      speed: number;
    }
    class Current extends DomainEntity<Current> implements Current {
      // no static primary declared
      public static unique = ['speed'] as const;
      public static schema = z.object({ speed: z.number() });
    }

    when(
      '.contract().ref("primary") is requested but no static primary exists',
      () => {
        then(
          'it fails fast with a requires-static-primary ConstraintError',
          () => {
            const error = getError(() => Current.contract().ref('primary'));
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('requires `static primary`');
            expect(error.message).toMatchSnapshot();
          },
        );
      },
    );

    when('.contract().ref("ref") is requested (unique-only arm)', () => {
      then(
        'the union-of-one degrades to the single unique shape, stamped by:"ref"',
        () => {
          const ref = Current.contract().ref();
          expect(getRefPragma(ref)).toEqual({ of: 'Current', by: 'ref' });
          const json: Record<string, any> = emit(ref);
          // no union: a single object, not an anyOf
          expect(json.anyOf).toBeUndefined();
          expect(json.properties.speed).toBeDefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainObject that declares neither primary nor unique', () => {
    interface Tide {
      height: number;
    }
    class Tide extends DomainObject<Tide> implements Tide {
      // neither static primary nor static unique declared
      public static schema = z.object({ height: z.number() });
    }

    when('.contract().ref("ref") is requested', () => {
      then(
        'it fails fast with a needs-at-least-one-key ConstraintError',
        () => {
          const error = getError(() => Tide.contract().ref());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('at least one of');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainEntity whose static unique is an EMPTY array', () => {
    // ⚠️ the i011 nitpick, and it is q24's failhide reached through the DECLARATION rather than the
    // payload. `[]` is truthy, so every gate read "yes, a unique key is declared": `.ref('unique')`
    // picked an empty object and reported success, and — worse — the vacuous arm matched EVERY
    // payload, so a `.ref()` union that ALSO declares a real primary never reached the primary. one
    // empty declaration swallowed the whole union while it reported success on all of it.
    interface Kelp {
      uuid?: string;
      strand: string;
    }
    class Kelp extends DomainEntity<Kelp> implements Kelp {
      public static primary = ['uuid'] as const;
      public static unique = [] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        strand: z.string(),
      });
    }

    when('.contract().ref("unique") is requested', () => {
      then('it fails fast rather than pick an empty object', () => {
        const error = getError(() => Kelp.contract().ref('unique'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('to name at least one key field');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('.contract().ref() is requested (the union)', () => {
      then(
        'the empty grain contributes no arm; the primary arm survives',
        () => {
          // ⚠️ HONEST LIMIT — dogfooded, and this one does NOT bite: it passes with the empty grain
          // restored too, because the union tries primary FIRST and this payload carries a uuid, so
          // the vacuous arm is never reached. it is a POSITIVE CONTROL — it proves the fix took no
          // real grain away with it — and the clamp that bites is its sibling below. recorded
          // rather than left silent, so nobody reads this as the guard (`rule.require.clamp-edge-cases`:
          // a clamp with no teeth is worse than absent when it is mistaken for one).
          const ref = Kelp.contract().ref();
          expect(ref.parse({ uuid: 'abc-123', strand: 'bull' })).toEqual({
            uuid: 'abc-123',
          });
        },
      );

      then(
        'a payload with NO primary key is refused, never reduced to {}',
        () => {
          // ⭐ THE biting half. with the empty grain restored, the vacuous arm matches every payload,
          // so this `safeParse` succeeds and yields `{}` — a reference to nowhere, reported as a
          // success. dogfooded to red.
          const ref = Kelp.contract().ref();
          const result = ref.safeParse({ strand: 'bull' });
          expect(result.success).toEqual(false);
        },
      );
    });
  });

  given('a DomainObject whose only declared grain is an EMPTY unique', () => {
    // the boundary of the case above: with no real grain left, `.ref()` must read as "declares no
    // key at all" rather than build a union of one vacuous arm.
    interface Froth {
      bubbles: number;
    }
    class Froth extends DomainObject<Froth> implements Froth {
      public static unique = [] as const;
      public static schema = z.object({ bubbles: z.number() });
    }

    when('.contract().ref() is requested', () => {
      then(
        'it fails fast with a needs-at-least-one-key ConstraintError',
        () => {
          const error = getError(() => Froth.contract().ref());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('at least one of');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainEntity whose declared key is absent from its schema', () => {
    interface Foam {
      uuid?: string;
    }
    class Foam extends DomainEntity<Foam> implements Foam {
      public static primary = ['uuid'] as const;
      public static unique = ['bubbles'] as const; // declared but not in schema
      public static schema = z.object({ uuid: z.string().optional() });
    }

    when('.contract().ref("unique") is requested', () => {
      then(
        'it fails fast with a key-absent-from-schema ConstraintError',
        () => {
          const error = getError(() => Foam.contract().ref('unique'));
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('absent from `static schema`');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('a caller that passes an unrecognized `by` value', () => {
    interface Swell {
      uuid?: string;
      height: number;
    }
    class Swell extends DomainEntity<Swell> implements Swell {
      public static primary = ['uuid'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        height: z.number(),
      });
    }

    when(
      '.contract().ref is called with a value outside the ts union (js caller bypass)',
      () => {
        then(
          'it fails fast rather than relabel the bad value as by:"ref"',
          () => {
            // `DomainObjectRefBy` is ts-only; a js/joi/yup caller can pass any value.
            // cast through `any` to simulate that bypass at the call site.
            const error = getError(() =>
              (Swell.contract().ref as any)('primry'),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('unrecognized');
            expect(error.message).toContain('primry');
            expect(error.message).toMatchSnapshot();
          },
        );
      },
    );
  });

  given('a two-hop cyclic unique-key graph (A.unique→B, B.unique→A)', () => {
    interface Ebb {
      uuid?: string;
      flow: Flow;
    }
    interface Flow {
      uuid?: string;
      ebb: Ebb;
    }
    class Ebb extends DomainEntity<Ebb> implements Ebb {
      public static primary = ['uuid'] as const;
      public static unique = ['flow'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        flow: z.object({ uuid: z.string().optional() }),
      });
    }
    class Flow extends DomainEntity<Flow> implements Flow {
      public static primary = ['uuid'] as const;
      public static unique = ['ebb'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        ebb: z.object({ uuid: z.string().optional() }),
      });
    }
    // bind the two-hop cycle after both classes are defined
    (Ebb as any).nested = { flow: Flow };
    (Flow as any).nested = { ebb: Ebb };

    when('.contract().ref("unique") is requested on one end', () => {
      then('it fails fast with a cyclic-graph ConstraintError', () => {
        const error = getError(() => Ebb.contract().ref('unique'));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cyclic unique-key graph');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the clamp for q24 — a ref arm must REQUIRE its own key fields
   * .why = `.pick()` inherits optionality from the author's schema, and a primary key is commonly
   *   `z.string().optional()`. without `.required()`, the primary arm succeeds VACUOUSLY on a
   *   unique-only payload, the union never reaches the unique arm, and `.ref()` parses to
   *   `{}` — a reference to nowhere, reported as a success (`rule.forbid.failhide`).
   * .note = this block goes RED if `.required()` is dropped from `pickDeclaredKeys`. it is the
   *   only coverage of the union's arm selection; the pragma snapshots above pass either way.
   */
  given(
    'a dobj whose PRIMARY key is optional, and a unique key (the q24 case)',
    () => {
      interface Surfer {
        uuid?: string;
        name: string;
        hometown: string;
      }
      class Surfer extends DomainEntity<Surfer> implements Surfer {
        public static primary = ['uuid'] as const;
        public static unique = ['name'] as const;
        public static schema = z.object({
          uuid: z.string().optional(), // db-generated, so optional on the wire
          name: z.string(),
          hometown: z.string(),
        });
      }

      when('a payload carries BOTH keys', () => {
        const both = { uuid: 'u-1', name: 'crush', hometown: 'pipeline' };

        then('.ref("ref") takes the primary arm and prunes to it', () => {
          expect(Surfer.contract().ref().parse(both)).toEqual({
            uuid: 'u-1',
          });
        });

        then('each narrow grain prunes to its own key', () => {
          expect(Surfer.contract().ref('primary').parse(both)).toEqual({
            uuid: 'u-1',
          });
          expect(Surfer.contract().ref('unique').parse(both)).toEqual({
            name: 'crush',
          });
        });
      });

      when('a payload carries ONLY the unique key', () => {
        const uniqueOnly = { name: 'crush', hometown: 'pipeline' };

        then('⭐ .ref("ref") falls back to the unique arm — never {}', () => {
          expect(Surfer.contract().ref().parse(uniqueOnly)).toEqual({
            name: 'crush',
          });
        });

        then(
          '.ref("primary") rejects it rather than yield an empty ref',
          () => {
            expect(
              Surfer.contract().ref('primary').safeParse(uniqueOnly).success,
            ).toBe(false);
          },
        );

        then('⭐ and the refusal NAMES THE FIX, in our words not zod’s', () => {
          // ⚠️ the ergonomist clamp for `rule.require.errors-name-the-fix`. before the per-field
          // `.nonoptional({ error })`, this read `Invalid input: expected nonoptional, received
          // undefined` — zod's internal vocabulary, with no name of the dobj, the grain, or the
          // move a caller should make. dogfooded: revert `pickDeclaredKeys` to the object-level
          // `.required()` and every assertion below goes red while the `success: false` above
          // stays green — which is exactly why that one is not enough on its own.
          const issue = Surfer.contract().ref('primary').safeParse(uniqueOnly)
            .error?.issues[0];
          expect(issue?.message).toContain("Surfer.contract().ref('primary')");
          expect(issue?.message).toContain("primary key 'uuid' is undefined");
          expect(issue?.message).toContain('must name a real key value');
          // the fix, not merely the symptom: supply the key, or use the other grain
          expect(issue?.message).toContain('or reference by the other grain');
          expect(issue?.path).toEqual(['uuid']);
          expect(issue?.message).toMatchSnapshot();
        });

        then(
          '⭐ and it reads the same way its runtime twin does (one voice, two surfaces)',
          () => {
            // the ctor already said it well; the schema now says it the same way. an undocumented
            // asymmetry between two surfaces that decide the SAME question is the defect class
            // this pr has fixed repeatedly — so this pins them together rather than each alone.
            const fromSchema = Surfer.contract()
              .ref('primary')
              .safeParse(uniqueOnly).error?.issues[0]?.message;
            const fromCtor = getError(() =>
              refByPrimary<typeof Surfer>(new Surfer(uniqueOnly) as any),
            ).message;

            expect(fromSchema).toContain("primary key 'uuid' is undefined");
            expect(fromCtor).toContain("primary key 'uuid' is undefined");
          },
        );
      });

      when('a payload carries NEITHER key', () => {
        const neither = { hometown: 'pipeline' };

        then('every grain rejects it', () => {
          expect(Surfer.contract().ref().safeParse(neither).success).toBe(
            false,
          );
          expect(
            Surfer.contract().ref('primary').safeParse(neither).success,
          ).toBe(false);
          expect(
            Surfer.contract().ref('unique').safeParse(neither).success,
          ).toBe(false);
        });
      });

      when('a key is present but undefined', () => {
        then('the grain rejects it — a ref must name a real key', () => {
          expect(
            Surfer.contract().ref('primary').safeParse({ uuid: undefined })
              .success,
          ).toBe(false);
        });
      });

      when('a full dobj INSTANCE is supplied', () => {
        then('zod prunes it to the ref shape, as a plain object', () => {
          const full = new Surfer({
            uuid: 'u-1',
            name: 'crush',
            hometown: 'pipeline',
          });
          const parsed = Surfer.contract().ref().parse(full);
          expect(parsed).toEqual({ uuid: 'u-1' });
          expect(parsed.constructor.name).toEqual('Object');
          expect('hometown' in parsed).toBe(false);
        });
      });

      when('the emitted json-schema is read', () => {
        then('the key is marked required, so the wire says so too', () => {
          const json: Record<string, any> = emit(
            Surfer.contract().ref('primary'),
          );
          expect(json.required).toEqual(['uuid']);
        });
      });
    },
  );

  given('a dobj whose PRIMARY key is required (the contrast to q24)', () => {
    interface Board {
      id: string;
      serial: string;
    }
    class Board extends DomainEntity<Board> implements Board {
      public static primary = ['id'] as const;
      public static unique = ['serial'] as const;
      public static schema = z.object({ id: z.string(), serial: z.string() });
    }

    when('the same payloads are parsed', () => {
      then('the results match the optional-primary dobj cell for cell', () => {
        expect(
          Board.contract().ref().parse({ id: 'i-1', serial: 's-9' }),
        ).toEqual({ id: 'i-1' });
        expect(Board.contract().ref().parse({ serial: 's-9' })).toEqual({
          serial: 's-9',
        });
        expect(Board.contract().ref().safeParse({}).success).toBe(false);
      });
    });
  });
});
