import { ConstraintError } from 'helpful-errors';
import Joi from 'joi';
import { getError, given, then, when } from 'test-fns';
import * as yup from 'yup';
import { z } from 'zod';

// import the published type from the package barrel (not the internal file) so these
// conformance tests also verify ask-1's deliverable: the type is reachable from the public api
import type { DomainObjectKind, DomainObjectPragma } from '@src/index';
import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainEvent } from '@src/instantiation/DomainEvent';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { DomainObject } from '@src/instantiation/DomainObject';

import { getContract } from './getContract';

/**
 * .what = helper to read the x-domain-object pragma out of a stamped schema's json-schema
 * .why = the pragma carried through z.toJSONSchema() is the actual deliverable; assert on it
 * .note = `{ io: 'input' }` unconditionally, at every emit. the contract coerces, so its OUT side
 *   is a live class instance — which json-schema cannot represent, and the emit throws. the IN side
 *   is also the only face that carries the pragma, so the flag is right on two counts.
 * .note = ⚠️ **the one visible consequence in the snapshots below: `additionalProperties: false` is
 *   absent.** it is emitted only on the OUT face, so the flag above drops it — and that is the
 *   single most widespread line in this pr's snapshot diff. it is NOT a weakened assertion, and the
 *   claim is measured rather than argued (`getContract.coerce.test.ts`, given *"the ONE key that
 *   differs between the two io faces"*): the two faces are byte-identical apart from that key, and
 *   an unknown key is **stripped, never rejected**, at both faces — zod's `z.object` strips by
 *   default, and always did. so `additionalProperties: false` described the value a parse HANDS
 *   BACK (extras already stripped), never a guarantee about what a caller may SEND.
 */
const emit = (schema: z.ZodType<any, any>): Record<string, any> =>
  z.toJSONSchema(schema, { io: 'input' });
const getPragma = (schema: z.ZodType<any, any>): Record<string, any> =>
  emit(schema)['x-domain-object'];

describe('getContract', () => {
  given('a DomainEntity with primary, unique, alias, and nested', () => {
    interface Seaturtle {
      uuid?: string;
      name: string;
    }
    class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
      public static primary = ['uuid'] as const;
      public static unique = ['name'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        name: z.string(),
      });
    }

    interface SeaturtleSurfboard {
      uuid?: string;
      serialNumber: string;
      rider: Seaturtle;
    }
    class SeaturtleSurfboard
      extends DomainEntity<SeaturtleSurfboard>
      implements SeaturtleSurfboard
    {
      public static primary = ['uuid'] as const;
      public static unique = ['serialNumber'] as const;
      public static alias = { singular: 'surfboard', plural: 'surfboards' };
      public static nested = { rider: Seaturtle };
      public static schema = z.object({
        uuid: z.string().optional(),
        serialNumber: z.string(),
        rider: z.object({ uuid: z.string().optional(), name: z.string() }),
      });
    }

    when('the contract is requested via getContract', () => {
      then(
        'the pragma carries name + primary + unique + alias + nested names',
        () => {
          const pragma = getPragma(SeaturtleSurfboard.contract());
          expect(pragma).toEqual({
            name: 'SeaturtleSurfboard',
            kind: 'entity',
            primary: ['uuid'],
            unique: ['serialNumber'],
            alias: { singular: 'surfboard', plural: 'surfboards' },
            nested: { rider: 'Seaturtle' },
          });
        },
      );

      then('the json-schema output matches snapshot', () => {
        const json: Record<string, any> = emit(SeaturtleSurfboard.contract());
        // assert the deliverable concretely, then snapshot for visual review
        expect(json['x-domain-object'].name).toEqual('SeaturtleSurfboard');
        expect(json.properties.rider).toBeDefined();
        expect(json).toMatchSnapshot();
      });

      then(
        'the stamped pragma conforms to the published DomainObjectPragma type',
        () => {
          // type the expected shape as the published type: if getContract's runtime output drifts
          // from DomainObjectPragma, this fails; if the type itself is wrong, `expected` won't compile.
          // this couples the runtime stamp to the type consumers import (ask 1).
          // `kind` is bound through the published `DomainObjectKind` name too, so a regression that
          // drops either export from the barrel fails to compile (both names are ask-1 deliverables).
          const kind: DomainObjectKind = 'entity';
          const expected: DomainObjectPragma = {
            name: 'SeaturtleSurfboard',
            kind,
            primary: ['uuid'],
            unique: ['serialNumber'],
            alias: { singular: 'surfboard', plural: 'surfboards' },
            nested: { rider: 'Seaturtle' },
          };
          expect(getPragma(SeaturtleSurfboard.contract())).toEqual(expected);
        },
      );

      then('the emitted pragma keys do NOT alias the class statics', () => {
        // the stamp reads `dobj.primary` / `dobj.unique`, which ARE the class's own static arrays.
        // a bare assignment would carry those very arrays outward, so a consumer who mutated
        // `pragma.primary` would mutate `Klass.primary` and every other reader of it.
        // ⚠️ HONEST LIMIT — this clamp does not bite on `asDomainObjectPragma`'s copy, and it is
        // recorded as such rather than dressed up as one (`rule.require.clamp-edge-cases`: a clamp
        // with no teeth is worse than absent). measured: it passes with OR without the copy,
        // because the only public path to a pragma is `z.toJSONSchema`, which already emits a
        // fresh array — and `.meta()` reads `undefined` on the coerced schema, so the raw stamped
        // object is unreachable. what this clamps is therefore **zod's** clone behavior, which we
        // lean on, exactly as the `io`-throw snapshots pin zod's error text. if a version bump
        // ever emitted the source array by reference, our copy keeps the guarantee and this stays
        // green — which is the point of the copy.
        const stamped = getPragma(SeaturtleSurfboard.contract());
        expect(stamped.primary).not.toBe(SeaturtleSurfboard.primary);
        expect(stamped.unique).not.toBe(SeaturtleSurfboard.unique);
        // and the VALUES still match — a copy, never a drop
        expect(stamped.primary).toEqual(['uuid']);
        expect(stamped.unique).toEqual(['serialNumber']);
      });

      then(
        'the contract still validates data after the .ref augmentation (schema intact)',
        () => {
          // `.contract()` is a real, publicly-embeddable zod schema, so it must still validate.
          // guards the in-place `Object.defineProperty` augmentation (and future zod upgrades)
          // against a silent break of runtime validation via the .ref attachment.
          const contract = SeaturtleSurfboard.contract();
          const valid = {
            uuid: 'a-uuid',
            serialNumber: 'SN-1',
            rider: { uuid: 'r-uuid', name: 'Crush' },
          };
          expect(contract.safeParse(valid).success).toEqual(true);
          expect(contract.safeParse({ serialNumber: 42 }).success).toEqual(
            false,
          );
        },
      );
    });

    when('the contract is requested via the .contract getter', () => {
      then('the getter returns the same stamped pragma', () => {
        const pragma = getPragma(SeaturtleSurfboard.contract());
        expect(pragma).toEqual({
          name: 'SeaturtleSurfboard',
          kind: 'entity',
          primary: ['uuid'],
          unique: ['serialNumber'],
          alias: { singular: 'surfboard', plural: 'surfboards' },
          nested: { rider: 'Seaturtle' },
        });
      });

      then('repeated access returns the same instance (idempotent)', () => {
        // the per-class memo means a fresh `.meta()` schema is not re-made each call —
        // at BOTH levels: the fn `.contract` and the boundary `.contract()` it yields
        expect(SeaturtleSurfboard.contract).toBe(SeaturtleSurfboard.contract);
        expect(SeaturtleSurfboard.contract).toBe(
          getContract(SeaturtleSurfboard),
        );
        expect(SeaturtleSurfboard.contract()).toBe(
          SeaturtleSurfboard.contract(),
        );
      });
    });

    when('the contract is stamped', () => {
      then('the source schema is left un-stamped (no mutation)', () => {
        SeaturtleSurfboard.contract();
        const sourcePragma = getPragma(SeaturtleSurfboard.schema);
        expect(sourcePragma).toBeUndefined();
      });
    });

    when('the contract is embedded as a field in a parent z.object', () => {
      // this is the wish's primary journey: z.object({ surfboard: Dobj.contract() })
      // → z.toJSONSchema on the parent must carry x-domain-object on the nested field
      then(
        'the pragma survives on the nested field of the parent json-schema',
        () => {
          const parent = z.object({ surfboard: SeaturtleSurfboard.contract() });
          const json: Record<string, any> = emit(parent);
          // the cross-service consumer reads the pragma off the nested field, not the root
          expect(json.properties.surfboard['x-domain-object'].name).toEqual(
            'SeaturtleSurfboard',
          );
          // kind must survive the primary journey too — it is the field ask 2 exists to deliver
          expect(json.properties.surfboard['x-domain-object'].kind).toEqual(
            'entity',
          );
          expect(json.properties.surfboard['x-domain-object'].primary).toEqual([
            'uuid',
          ]);
          expect(json.properties.surfboard['x-domain-object'].nested).toEqual({
            rider: 'Seaturtle',
          });
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainLiteral with a primary but no unique/alias/nested', () => {
    interface Sandbar {
      uuid?: string;
      latitude: number;
      longitude: number;
    }
    class Sandbar extends DomainLiteral<Sandbar> implements Sandbar {
      public static primary = ['uuid'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      });
    }

    when('the contract is requested', () => {
      then(
        'the pragma carries name + kind + primary, absent fields left out',
        () => {
          const pragma = getPragma(Sandbar.contract());
          expect(pragma).toEqual({
            name: 'Sandbar',
            kind: 'literal',
            primary: ['uuid'],
          });
          expect(pragma.unique).toBeUndefined();
          expect(pragma.alias).toBeUndefined();
          expect(pragma.nested).toBeUndefined();
        },
      );

      then(
        'the json-schema output (primary-only form) matches snapshot',
        () => {
          const json: Record<string, any> = emit(Sandbar.contract());
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object']).toEqual({
            name: 'Sandbar',
            kind: 'literal',
            primary: ['uuid'],
          });
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainObject with polymorphic (array) nested choices', () => {
    interface Seaturtle {
      ref: string;
    }
    class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
      public static primary = ['ref'] as const;
      public static schema = z.object({ ref: z.string() });
    }
    interface Dolphin {
      ref: string;
    }
    class Dolphin extends DomainEntity<Dolphin> implements Dolphin {
      public static primary = ['ref'] as const;
      public static schema = z.object({ ref: z.string() });
    }

    interface Wave {
      uuid?: string;
      surfer: Seaturtle | Dolphin;
    }
    class Wave extends DomainEntity<Wave> implements Wave {
      public static primary = ['uuid'] as const;
      public static nested = { surfer: [Seaturtle, Dolphin] };
      public static schema = z.object({
        uuid: z.string().optional(),
        surfer: z.object({ ref: z.string() }),
      });
    }

    when('the contract is requested', () => {
      then('the pragma maps the array form to an array of nested names', () => {
        const pragma = getPragma(Wave.contract());
        expect(pragma.nested).toEqual({ surfer: ['Seaturtle', 'Dolphin'] });
      });

      then(
        'the json-schema output (array nested form) matches snapshot',
        () => {
          const json: Record<string, any> = emit(Wave.contract());
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object'].nested).toEqual({
            surfer: ['Seaturtle', 'Dolphin'],
          });
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a plain DomainObject with a schema and alias but no keys', () => {
    interface Seafoam {
      bubbles: number;
    }
    class Seafoam extends DomainObject<Seafoam> implements Seafoam {
      public static alias = 'foam';
      public static schema = z.object({ bubbles: z.number() });
    }

    when('the contract is requested', () => {
      then('the pragma carries name + kind + alias only', () => {
        const pragma = getPragma(Seafoam.contract());
        expect(pragma).toEqual({
          name: 'Seafoam',
          kind: 'object',
          alias: 'foam',
        });
        expect(pragma.primary).toBeUndefined();
        expect(pragma.unique).toBeUndefined();
      });

      then(
        'a minimal pragma (no primary/unique/nested) conforms to the type',
        () => {
          // proves the type's primary/unique/nested keys are genuinely optional (q7): a minimal
          // pragma without them must satisfy DomainObjectPragma, or a required-key regression breaks it
          const expected: DomainObjectPragma = {
            name: 'Seafoam',
            kind: 'object',
            alias: 'foam',
          };
          expect(getPragma(Seafoam.contract())).toEqual(expected);
        },
      );

      then(
        'the json-schema output (string alias form) matches snapshot',
        () => {
          const json: Record<string, any> = emit(Seafoam.contract());
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object']).toEqual({
            name: 'Seafoam',
            kind: 'object',
            alias: 'foam',
          });
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainObject with no schema declared', () => {
    interface Driftwood {
      grain: string;
    }
    class Driftwood extends DomainObject<Driftwood> implements Driftwood {}

    when('the contract is requested', () => {
      then('it fails fast with a ConstraintError', () => {
        const error = getError(() => getContract(Driftwood));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires a static schema');
        // snapshot the message so hint/word regressions surface in pr diffs
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainObject whose schema is joi, not zod', () => {
    interface JoiSandbar {
      name: string;
    }
    class JoiSandbar extends DomainObject<JoiSandbar> implements JoiSandbar {
      public static schema = Joi.object({ name: Joi.string() });
    }

    when('the contract is requested', () => {
      then('it fails fast with a ConstraintError', () => {
        const error = getError(() => getContract(JoiSandbar));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires a zod schema');
        // snapshot the message so hint/word regressions surface in pr diffs
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainObject whose schema is yup, not zod', () => {
    interface YupSandbar {
      name: string;
    }
    class YupSandbar extends DomainObject<YupSandbar> implements YupSandbar {
      public static schema = yup.object().shape({ name: yup.string() });
    }

    when('the contract is requested', () => {
      then('it fails fast with a ConstraintError', () => {
        const error = getError(() => getContract(YupSandbar));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires a zod schema');
        // snapshot the message so hint/word regressions surface in pr diffs
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('a DomainEvent', () => {
    interface WaveObservedEvent {
      sensorUuid: string;
      height: number;
      occurredAt: string;
    }
    class WaveObservedEvent
      extends DomainEvent<WaveObservedEvent>
      implements WaveObservedEvent
    {
      public static unique = ['sensorUuid', 'occurredAt'] as const;
      public static schema = z.object({
        sensorUuid: z.string(),
        height: z.number(),
        occurredAt: z.string(),
      });
    }

    when('the contract is requested', () => {
      then('the pragma stamps kind = event from the event marker', () => {
        const pragma = getPragma(WaveObservedEvent.contract());
        expect(pragma).toEqual({
          name: 'WaveObservedEvent',
          kind: 'event',
          unique: ['sensorUuid', 'occurredAt'],
        });
      });

      then('the json-schema output (event kind form) matches snapshot', () => {
        const json: Record<string, any> = emit(WaveObservedEvent.contract());
        // assert the deliverable concretely, then snapshot for visual review
        expect(json['x-domain-object'].kind).toEqual('event');
        expect(json).toMatchSnapshot();
      });
    });
  });

  given('a 2-level subclass of DomainEntity', () => {
    // a dobj that extends a subclass of DomainEntity must still read kind = entity,
    // since the marker symbol inherits down the full static prototype chain
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
    interface GreenSeaturtle extends Seaturtle {
      shellPattern: string;
    }
    class GreenSeaturtle extends Seaturtle implements GreenSeaturtle {
      public static schema = z.object({
        uuid: z.string().optional(),
        name: z.string(),
        shellPattern: z.string(),
      });
    }

    when('the contract is requested', () => {
      then('the pragma still stamps kind = entity through 2 levels', () => {
        const pragma = getPragma(GreenSeaturtle.contract());
        expect(pragma.kind).toEqual('entity');
      });

      then(
        'the json-schema output (2-level subclass form) matches snapshot',
        () => {
          const json: Record<string, any> = emit(GreenSeaturtle.contract());
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object'].kind).toEqual('entity');
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainEntity without a static primary', () => {
    // the mirror of the Sandbar case: the old `primary`-non-empty heuristic omits `primary`
    // (getContract skips absent fields), so it would misread this entity as a literal.
    // the marker-based kind must stamp `entity` regardless, and the pragma must omit `primary`.
    interface Tidepool {
      name: string;
      depth: number;
    }
    class Tidepool extends DomainEntity<Tidepool> implements Tidepool {
      public static unique = ['name'] as const;
      public static schema = z.object({
        name: z.string(),
        depth: z.number(),
      });
    }

    when('the contract is requested', () => {
      then('the pragma stamps kind = entity even with no primary', () => {
        const pragma = getPragma(Tidepool.contract());
        expect(pragma).toEqual({
          name: 'Tidepool',
          kind: 'entity',
          unique: ['name'],
        });
        expect(pragma.primary).toBeUndefined();
      });

      then(
        'the json-schema output (entity without primary form) matches snapshot',
        () => {
          const json: Record<string, any> = emit(Tidepool.contract());
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object'].kind).toEqual('entity');
          expect(json['x-domain-object'].primary).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });

  given(
    'a DomainEntity whose static nested names a field its schema lacks',
    () => {
      // ⚠️ the reachable shape of the i011 blocker. `.parse()` SUCCEEDS on this dobj —
      // `hydrateNestedDomainObjects` no-ops on an absent key — so the only reader that ever saw the
      // lie was a downstream codegen, which read `nested: { board: 'Surfboard' }` against a
      // json-schema whose `properties` carry no `board`. the guard moves that failure back onto the
      // channel a caller can act on (`rule.forbid.failhide`).
      interface Surfboard {
        serial: string;
      }
      class Surfboard extends DomainLiteral<Surfboard> implements Surfboard {
        public static schema = z.object({ serial: z.string() });
      }

      interface Rack {
        uuid?: string;
        label: string;
      }
      class Rack extends DomainEntity<Rack> implements Rack {
        public static unique = ['label'] as const;
        public static schema = z.object({
          uuid: z.string().optional(),
          label: z.string(),
        });
        // declared nested, but `board` is absent from the schema above
        public static nested = { board: Surfboard };
      }

      when('the contract is requested', () => {
        then(
          'it fails fast with a nested-key-absent-from-schema ConstraintError',
          () => {
            const error = getError(() => Rack.contract());
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain("key 'board'");
            expect(error.message).toContain('static nested');
            expect(error.message).toContain('absent from `static schema`');
            // it names the fix, not merely the symptom: which of the two declarations to edit
            expect(error.message).toContain("add 'board' to Rack's schema");
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('a dobj SUBCLASS that inherits its parent declarations', () => {
    // the r010 nitpick: `class Y extends X {}` was untested at the coerce path. the whole surface
    // rests on `this` binding to the SUBCLASS at a call (the law in
    // `define.subclass-identity-needs-a-call`), and a subclass is the only shape where "which class
    // did `this` bind to" has two possible answers. it also probes the memo, which is keyed by class
    // constructor: a parent and its subclass are distinct keys, so each must get its OWN contract.
    interface Board {
      uuid?: string;
      serial: string;
    }
    class Board extends DomainEntity<Board> implements Board {
      public static unique = ['serial'] as const;
      public static schema = z.object({
        uuid: z.string().optional(),
        serial: z.string(),
      });
    }
    class Thruster extends Board {}

    when('the subclass contract is requested', () => {
      then('the pragma names the SUBCLASS, not the parent', () => {
        expect(getPragma(Thruster.contract()).name).toEqual('Thruster');
        expect(getPragma(Board.contract()).name).toEqual('Board');
      });

      then('the parse yields an instance of the SUBCLASS', () => {
        const out = Thruster.contract().parse({ serial: 'sn-9' });
        expect(out).toBeInstanceOf(Thruster);
        // ⭐ the assertion that bites: a Thruster IS a Board, so `toBeInstanceOf(Board)` would pass
        // even had `this` bound to the parent. the constructor identity is the discriminating check
        expect(out.constructor.name).toEqual('Thruster');
      });

      then('each class memoizes its own contract, never a shared one', () => {
        expect(Thruster.contract()).toBe(Thruster.contract());
        expect(Thruster.contract()).not.toBe(Board.contract());
      });
    });
  });

  given('a DomainObject whose static schema is a SCALAR, not an object', () => {
    // ⚠️⚠️ the sharpest failhide this feature produced, and it had NO channel at all. a contract
    // coerces, and the decode ends in `Object.assign(this, props)` — but a domain object is a record
    // of named props by construction, so a scalar has none to assign. MEASURED before the guard:
    //
    //     Fin.contract().parse('thruster')
    //       → { "0":"t", "1":"h", "2":"r", "3":"u", "4":"s", "5":"t", "6":"e", "7":"r" }
    //       → instanceof Fin === true, no throw, no zod issue, result.success === true
    //
    // the ctor does not THROW, so `coerceIntoInstance`'s catch never engages and the guard built for
    // exactly this case never sees it. a nonsense instance crosses a public boundary and is reported
    // as a clean parse — no exception, no issue, no failed branch (`rule.forbid.failhide`).
    //
    // ⚠️ and an earlier draft of this very file asserted `.not.toThrow()` on this dobj and called it
    // a negative control. it passed, because a throw was never the symptom. a clamp that asserts the
    // absence of the wrong signal is worse than absent — it reads as coverage of the case it walks
    // past (`rule.require.clamp-edge-cases`).
    class Fin extends DomainObject<any> {
      public static schema = z.string();
    }

    when('the contract is requested', () => {
      then(
        'it fails fast with a requires-object-schema ConstraintError',
        () => {
          const error = getError(() => Fin.contract());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('requires an object schema');
          // it names WHY, not merely the rule: a coerce constructs from named props
          expect(error.message).toContain('record of named props');
          expect(error.message).toContain("declare Fin's schema as a z.object");
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('a DomainObject whose static schema is an ARRAY, not an object', () => {
    // the same hole one type over — an array also boxes into indexed props under `Object.entries`.
    // clamped alongside the string so the guard is proven to key on "is an object shape" rather
    // than on "is a string", which a narrower fix could have done while it passed the case above.
    class Sett extends DomainObject<any> {
      public static schema = z.array(z.string());
    }

    when('the contract is requested', () => {
      then('it fails fast with the same requires-object-schema error', () => {
        const error = getError(() => Sett.contract());
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('requires an object schema');
      });
    });
  });

  given(
    'a DomainObject that declares static nested atop a NON-object schema',
    () => {
      // this case now meets the coerce-path guard one step EARLIER than its own `.nested` check —
      // which is the right order (the schema cannot serve a coerce at all, whatever it declares),
      // and is kept as its own clamp so the two demands cannot silently collapse into one.
      interface Feather {
        span: number;
      }
      class Feather extends DomainLiteral<Feather> implements Feather {
        public static schema = z.object({ span: z.number() });
      }

      class Chant extends DomainObject<any> {
        public static schema = z.string();
        public static nested = { feather: Feather };
      }

      when('the contract is requested', () => {
        then(
          'it fails fast with a requires-object-schema ConstraintError',
          () => {
            const error = getError(() => Chant.contract());
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('requires an object schema');
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );
});
