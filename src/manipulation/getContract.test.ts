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
 */
const getPragma = (schema: z.ZodSchema<any>): Record<string, any> => {
  const json: Record<string, any> = z.toJSONSchema(schema);
  return json['x-domain-object'];
};

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
          const pragma = getPragma(getContract(SeaturtleSurfboard));
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
        const json: Record<string, any> = z.toJSONSchema(
          getContract(SeaturtleSurfboard),
        );
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
          expect(getPragma(getContract(SeaturtleSurfboard))).toEqual(expected);
        },
      );

      then(
        'the contract still validates data after the .ref augmentation (schema intact)',
        () => {
          // `.contract` is a real, publicly-embeddable zod schema, so it must still validate.
          // guards the in-place `Object.defineProperty` augmentation (and future zod upgrades)
          // against a silent break of runtime validation via the .ref attachment.
          const contract = getContract(SeaturtleSurfboard);
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
        const pragma = getPragma(SeaturtleSurfboard.contract);
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
        // the per-class memo means a fresh `.meta()` schema is not re-made each call
        expect(getContract(SeaturtleSurfboard)).toBe(
          getContract(SeaturtleSurfboard),
        );
        expect(SeaturtleSurfboard.contract).toBe(SeaturtleSurfboard.contract);
        expect(SeaturtleSurfboard.contract).toBe(
          getContract(SeaturtleSurfboard),
        );
      });
    });

    when('the contract is stamped', () => {
      then('the source schema is left un-stamped (no mutation)', () => {
        getContract(SeaturtleSurfboard);
        const sourcePragma = getPragma(SeaturtleSurfboard.schema);
        expect(sourcePragma).toBeUndefined();
      });
    });

    when('the contract is embedded as a field in a parent z.object', () => {
      // this is the wish's primary journey: z.object({ surfboard: Dobj.contract })
      // → z.toJSONSchema on the parent must carry x-domain-object on the nested field
      then(
        'the pragma survives on the nested field of the parent json-schema',
        () => {
          const parent = z.object({ surfboard: SeaturtleSurfboard.contract });
          const json: Record<string, any> = z.toJSONSchema(parent);
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
          const pragma = getPragma(getContract(Sandbar));
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
          const json: Record<string, any> = z.toJSONSchema(
            getContract(Sandbar),
          );
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
        const pragma = getPragma(getContract(Wave));
        expect(pragma.nested).toEqual({ surfer: ['Seaturtle', 'Dolphin'] });
      });

      then(
        'the json-schema output (array nested form) matches snapshot',
        () => {
          const json: Record<string, any> = z.toJSONSchema(getContract(Wave));
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
        const pragma = getPragma(getContract(Seafoam));
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
          expect(getPragma(getContract(Seafoam))).toEqual(expected);
        },
      );

      then(
        'the json-schema output (string alias form) matches snapshot',
        () => {
          const json: Record<string, any> = z.toJSONSchema(
            getContract(Seafoam),
          );
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
        const pragma = getPragma(getContract(WaveObservedEvent));
        expect(pragma).toEqual({
          name: 'WaveObservedEvent',
          kind: 'event',
          unique: ['sensorUuid', 'occurredAt'],
        });
      });

      then('the json-schema output (event kind form) matches snapshot', () => {
        const json: Record<string, any> = z.toJSONSchema(
          getContract(WaveObservedEvent),
        );
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
        const pragma = getPragma(getContract(GreenSeaturtle));
        expect(pragma.kind).toEqual('entity');
      });

      then(
        'the json-schema output (2-level subclass form) matches snapshot',
        () => {
          const json: Record<string, any> = z.toJSONSchema(
            getContract(GreenSeaturtle),
          );
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
        const pragma = getPragma(getContract(Tidepool));
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
          const json: Record<string, any> = z.toJSONSchema(
            getContract(Tidepool),
          );
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object'].kind).toEqual('entity');
          expect(json['x-domain-object'].primary).toBeUndefined();
          expect(json).toMatchSnapshot();
        },
      );
    });
  });
});
