import { ConstraintError } from 'helpful-errors';
import Joi from 'joi';
import { getError, given, then, when } from 'test-fns';
import * as yup from 'yup';
import { z } from 'zod';

import { DomainEntity } from '@src/instantiation/DomainEntity';
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
    });

    when('the contract is requested via the .contract getter', () => {
      then('the getter returns the same stamped pragma', () => {
        const pragma = getPragma(SeaturtleSurfboard.contract);
        expect(pragma).toEqual({
          name: 'SeaturtleSurfboard',
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
      // → z.toJSONSchema on the PARENT must carry x-domain-object on the nested field
      then(
        'the pragma survives on the nested field of the parent json-schema',
        () => {
          const parent = z.object({ surfboard: SeaturtleSurfboard.contract });
          const json: Record<string, any> = z.toJSONSchema(parent);
          // the cross-service consumer reads the pragma off the nested field, not the root
          expect(json.properties.surfboard['x-domain-object'].name).toEqual(
            'SeaturtleSurfboard',
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
      then('the pragma carries name + primary, absent fields left out', () => {
        const pragma = getPragma(getContract(Sandbar));
        expect(pragma).toEqual({ name: 'Sandbar', primary: ['uuid'] });
        expect(pragma.unique).toBeUndefined();
        expect(pragma.alias).toBeUndefined();
        expect(pragma.nested).toBeUndefined();
      });

      then(
        'the json-schema output (primary-only form) matches snapshot',
        () => {
          const json: Record<string, any> = z.toJSONSchema(
            getContract(Sandbar),
          );
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object']).toEqual({
            name: 'Sandbar',
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
      then('the pragma carries name + alias only', () => {
        const pragma = getPragma(getContract(Seafoam));
        expect(pragma).toEqual({ name: 'Seafoam', alias: 'foam' });
        expect(pragma.primary).toBeUndefined();
        expect(pragma.unique).toBeUndefined();
      });

      then(
        'the json-schema output (string alias form) matches snapshot',
        () => {
          const json: Record<string, any> = z.toJSONSchema(
            getContract(Seafoam),
          );
          // assert the deliverable concretely, then snapshot for visual review
          expect(json['x-domain-object']).toEqual({
            name: 'Seafoam',
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
});
