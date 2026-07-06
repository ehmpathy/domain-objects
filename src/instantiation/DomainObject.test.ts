import { ConstraintError } from 'helpful-errors';
import Joi from 'joi';
import { getError } from 'test-fns';
import { getUuid as uuid } from 'uuid-fns';
import * as yup from 'yup';
import { z } from 'zod';

import { DomainObject } from './DomainObject';
import { HelpfulJoiValidationError } from './validate/HelpfulJoiValidationError';
import { HelpfulYupValidationError } from './validate/HelpfulYupValidationError';
import { HelpfulZodValidationError } from './validate/HelpfulZodValidationError';

describe('DomainObject', () => {
  describe('domain modeling use cases', () => {
    it('should be able to represent a literal', () => {
      interface ChatMessage {
        userUuid: string;
        conversationUuid: string;
        message: string;
      }
      class ChatMessage
        extends DomainObject<ChatMessage>
        implements ChatMessage {}
      const message = new ChatMessage({
        userUuid: uuid(),
        conversationUuid: uuid(),
        message: 'Hello, World!',
      });
      expect(message).toBeInstanceOf(ChatMessage); // sanity check
    });
    it('should be able to represent an entity', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {}
      const ship = new RocketShip({
        serialNumber: uuid(),
        fuelQuantity: 9001,
        passengers: 21,
      });
      expect(ship).toBeInstanceOf(RocketShip); // sanity check
    });
  });

  describe('instantiation', () => {
    interface ChatMessage {
      userUuid: string;
      conversationUuid: string;
      message: string;
    }
    class ChatMessage
      extends DomainObject<ChatMessage>
      implements ChatMessage {}
    it('should assign all properties in the constructor to the instance', () => {
      const message = new ChatMessage({
        userUuid: '__USER_UUID__',
        conversationUuid: '__CONVO_UUID__',
        message: 'Hello, World!',
      });
      expect(message.userUuid).toEqual('__USER_UUID__');
      expect(message.conversationUuid).toEqual('__CONVO_UUID__');
      expect(message.message).toEqual('Hello, World!');
    });
    it('should be able to spread into itself', () => {
      const message = new ChatMessage({
        userUuid: '__USER_UUID__',
        conversationUuid: '__CONVO_UUID__',
        message: 'Hello, World!',
      });
      const updatedMessage = new ChatMessage({
        ...message,
        message: `Hello, World!\n Edit: You're great!`,
      });
      expect(updatedMessage.userUuid).toEqual('__USER_UUID__');
      expect(updatedMessage.conversationUuid).toEqual('__CONVO_UUID__');
      expect(updatedMessage.message).toEqual(
        `Hello, World!\n Edit: You're great!`,
      );
    });
  });

  describe('validation', () => {
    describe('Joi schema', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      const schema = Joi.object().keys({
        serialNumber: Joi.string().uuid().required(),
        fuelQuantity: Joi.number().required(),
        passengers: Joi.number().max(42).required(),
      });
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {
        public static schema = schema;
      }
      it('should not throw error if when valid', () => {
        const ship = new RocketShip({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });
        expect(ship).toBeInstanceOf(RocketShip); // sanity check
      });
      it('should throw a helpful error when does not pass joi schema', () => {
        try {
          // eslint-disable-next-line no-new
          new RocketShip({
            serialNumber: '__SOME_UUID__',
            fuelQuantity: 9001,
            passengers: 50,
          });
          throw new Error('should not reach here');
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          expect(error).toBeInstanceOf(HelpfulJoiValidationError);
          expect(error.message).toMatchSnapshot();
        }
      });
    });
    describe('Yup schema', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      const schema = yup.object({
        serialNumber: yup.string().required(),
        fuelQuantity: yup.number().required(),
        passengers: yup.number().max(42).required(),
      });
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {
        public static schema = schema;
      }
      it('should not throw error if when valid', () => {
        const ship = new RocketShip({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });
        expect(ship).toBeInstanceOf(RocketShip); // sanity check
      });
      it('should throw a helpful error when does not pass schema', () => {
        try {
          // eslint-disable-next-line no-new
          new RocketShip({
            serialNumber: '__SOME_UUID__',
            fuelQuantity: 9001,
            passengers: 50,
          });
          throw new Error('should not reach here');
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          expect(error).toBeInstanceOf(HelpfulYupValidationError);
          expect(error.message).toMatchSnapshot();
        }
      });
    });

    describe('Zod schema', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      const schema = z.object({
        serialNumber: z.string(),
        fuelQuantity: z.number(),
        passengers: z.number().max(42),
      });
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {
        public static schema = schema;
      }
      it('should not throw error if when valid', () => {
        const ship = new RocketShip({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });
        expect(ship).toBeInstanceOf(RocketShip); // sanity check
      });
      it('should throw a helpful error when does not pass schema', () => {
        try {
          // eslint-disable-next-line no-new
          new RocketShip({
            serialNumber: '__SOME_UUID__',
            fuelQuantity: 9001,
            passengers: 50,
          });
          throw new Error('should not reach here');
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          expect(error).toBeInstanceOf(HelpfulZodValidationError);
          expect(error.message).toMatchSnapshot();
        }
      });
    });

    describe('hydration', () => {
      it('should hydrate nested domain objects', () => {
        // define the plant pot
        interface PlantPot {
          diameterInInches: number;
        }
        class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

        // define the plant
        interface Plant {
          pot: PlantPot;
          lastWatered: string;
        }
        class Plant extends DomainObject<Plant> implements Plant {
          public static nested = { pot: PlantPot };
        }

        // now show that we hydrate the pot
        const plant = new Plant({
          pot: { diameterInInches: 7 },
          lastWatered: 'monday',
        });
        expect(plant.pot).toBeInstanceOf(PlantPot);
      });
      it('should hydrate nested array of domain objects', () => {
        // define the plant owners
        interface PlantOwner {
          name: string;
        }
        class PlantOwner
          extends DomainObject<PlantOwner>
          implements PlantOwner {}

        // define the plant
        interface Plant {
          owners: PlantOwner[];
          lastWatered: string;
        }
        class Plant extends DomainObject<Plant> implements Plant {
          public static nested = { owners: PlantOwner };
        }

        // now show that we hydrate the pot
        const plant = new Plant({
          owners: [{ name: 'bob' }],
          lastWatered: 'monday',
        });
        plant.owners.forEach((owner) =>
          expect(owner).toBeInstanceOf(PlantOwner),
        );
      });
      it('should not hydrate nullable nested domain objects when null', () => {
        // define the plant owners
        interface PlantOwner {
          name: string;
        }
        class PlantOwner
          extends DomainObject<PlantOwner>
          implements PlantOwner {}

        // define the plant
        interface Plant {
          owners: PlantOwner[] | null;
          lastWatered: string;
        }
        class Plant extends DomainObject<Plant> implements Plant {
          public static nested = { owners: PlantOwner };
        }

        // now show that we hydrate the pot
        const plant = new Plant({ owners: null, lastWatered: 'monday' });
        expect(plant.owners).toEqual(null); // should still be null - since should not have instantiated
      });
      it('should hydrate nested domain objects correctly when given choice of different options', () => {
        // define the plant pot
        interface PlantPot {
          diameterInInches: number;
        }
        class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

        // define the plant bed
        interface PlantBed {
          location: string;
        }
        class PlantBed extends DomainObject<PlantBed> implements PlantBed {}

        // define the plant
        interface Plant {
          plantedIn: PlantPot | PlantBed;
          lastWatered: string;
        }
        class Plant extends DomainObject<Plant> implements Plant {
          public static nested = { plantedIn: [PlantPot, PlantBed] };
        }

        // now show that we hydrate the pot correctly
        const plant = new Plant({
          plantedIn: { _dobj: 'PlantPot', diameterInInches: 7 } as PlantPot,
          lastWatered: 'monday',
        });
        expect(plant.plantedIn).toBeInstanceOf(PlantPot);
      });
      it('should leave a bare array of scalars un-hydrated under a single-option nested key', () => {
        // define the seaturtle's forage wrapper
        interface SeaturtleForage {
          include?: string;
          exclude?: string;
        }
        class SeaturtleForage
          extends DomainObject<SeaturtleForage>
          implements SeaturtleForage {}

        // define the seaturtle, whose forage may be a bare scalar, bare array, or wrapper
        interface Seaturtle {
          forage: string | string[] | SeaturtleForage;
        }
        class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
          public static nested = { forage: SeaturtleForage };
        }

        // a bare array of strings should stay a bare array of strings, not become wrappers
        const seaturtle = new Seaturtle({ forage: ['seagrass', 'jellyfish'] });
        expect(seaturtle.forage).toEqual(['seagrass', 'jellyfish']);
        (seaturtle.forage as string[]).forEach((food) =>
          expect(food).not.toBeInstanceOf(SeaturtleForage),
        );
      });
      it('should support a mixed union on one nested key: bare scalar, bare array, and object-wrapper', () => {
        // define the seaturtle's forage wrapper
        interface SeaturtleForage {
          include?: string;
          exclude?: string;
        }
        class SeaturtleForage
          extends DomainObject<SeaturtleForage>
          implements SeaturtleForage {}

        // define the seaturtle
        interface Seaturtle {
          forage: string | string[] | SeaturtleForage;
        }
        class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
          public static nested = { forage: SeaturtleForage };
        }

        // bare scalar stays bare
        expect(new Seaturtle({ forage: 'seagrass' }).forage).toEqual(
          'seagrass',
        );

        // bare array stays bare
        expect(
          new Seaturtle({ forage: ['seagrass', 'jellyfish'] }).forage,
        ).toEqual(['seagrass', 'jellyfish']);

        // object with include maps to a wrapper instance
        const included = new Seaturtle({ forage: { include: 'seagrass' } });
        expect(included.forage).toBeInstanceOf(SeaturtleForage);
        expect((included.forage as SeaturtleForage).include).toEqual(
          'seagrass',
        );

        // object with exclude maps to a wrapper instance
        const excluded = new Seaturtle({ forage: { exclude: 'jellyfish' } });
        expect(excluded.forage).toBeInstanceOf(SeaturtleForage);
        expect((excluded.forage as SeaturtleForage).exclude).toEqual(
          'jellyfish',
        );
      });
      it('should hydrate object elements and leave bare scalar elements in a mixed array', () => {
        // define the seaturtle's forage wrapper
        interface SeaturtleForage {
          include?: string;
          exclude?: string;
        }
        class SeaturtleForage
          extends DomainObject<SeaturtleForage>
          implements SeaturtleForage {}

        // define the seaturtle, whose forage may be an array of scalars or wrappers
        interface Seaturtle {
          forage: Array<string | SeaturtleForage>;
        }
        class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
          public static nested = { forage: SeaturtleForage };
        }

        // a mixed array leaves the scalar bare and hydrates the object
        const seaturtle = new Seaturtle({
          forage: ['seagrass', { include: 'jellyfish' }],
        });
        expect(seaturtle.forage[0]).toEqual('seagrass');
        expect(seaturtle.forage[0]).not.toBeInstanceOf(SeaturtleForage);
        expect(seaturtle.forage[1]).toBeInstanceOf(SeaturtleForage);
        expect((seaturtle.forage[1] as SeaturtleForage).include).toEqual(
          'jellyfish',
        );
      });
      it('should pass through a bare scalar element under a multi-option nested key', () => {
        // define two forage wrapper options
        interface SeaturtleForageInclude {
          include: string;
        }
        class SeaturtleForageInclude
          extends DomainObject<SeaturtleForageInclude>
          implements SeaturtleForageInclude {}

        interface SeaturtleForageExclude {
          exclude: string;
        }
        class SeaturtleForageExclude
          extends DomainObject<SeaturtleForageExclude>
          implements SeaturtleForageExclude {}

        // define the seaturtle with a multi-option nested key
        interface Seaturtle {
          forage: Array<
            string | SeaturtleForageInclude | SeaturtleForageExclude
          >;
        }
        class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
          public static nested = {
            forage: [SeaturtleForageInclude, SeaturtleForageExclude],
          };
        }

        // a bare scalar element passes through instead of a throw over the ambiguous options
        const seaturtle = new Seaturtle({ forage: ['seagrass'] });
        expect(seaturtle.forage[0]).toEqual('seagrass');
        expect(seaturtle.forage[0]).not.toBeInstanceOf(SeaturtleForageInclude);
        expect(seaturtle.forage[0]).not.toBeInstanceOf(SeaturtleForageExclude);
      });
    });
  });

  describe('.contract', () => {
    it('should stamp identity + key metadata onto the schema for a seaturtle entity', () => {
      // define a seaturtle domain entity with a zod schema + keys
      interface Seaturtle {
        uuid?: string;
        name: string;
        species: string;
      }
      class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
        public static primary = ['uuid'] as const;
        public static unique = ['name'] as const;
        public static alias = { singular: 'seaturtle', plural: 'seaturtles' };
        public static schema = z.object({
          uuid: z.string().optional(),
          name: z.string(),
          species: z.string(),
        });
      }

      // read the contract and serialize it to json-schema
      const json: Record<string, any> = z.toJSONSchema(Seaturtle.contract);

      // the x-domain-object pragma carries the seaturtle's identity + keys across the wire
      expect(json['x-domain-object']).toEqual({
        name: 'Seaturtle',
        primary: ['uuid'],
        unique: ['name'],
        alias: { singular: 'seaturtle', plural: 'seaturtles' },
      });

      // snapshot the full json-schema for visual review in prs
      expect(json).toMatchSnapshot();
    });

    it('should fail fast with a ConstraintError when no schema is declared', () => {
      // a seaturtle without a schema has no shape to identify
      interface Seaturtle {
        name: string;
      }
      class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {}

      const error = getError(() => Seaturtle.contract);
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error.message).toContain('requires a static schema');

      // snapshot the message so hint/word regressions surface in pr diffs
      expect(error.message).toMatchSnapshot();
    });
  });

  describe('.build', () => {
    it('should reject props with extra keys', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {}

      RocketShip.build({
        serialNumber: uuid(),
        fuelQuantity: 1000,
        passengers: 5,
        // @ts-expect-error — extra key not defined in RocketShip
        unauthorizedKey: true,
      });
    });

    it('should reject props with missing required keys', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {}

      // @ts-expect-error — missing required field `serialNumber`
      RocketShip.build({
        fuelQuantity: 1000,
        passengers: 5,
      });
    });

    it('should reject props with wrong types', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {}

      RocketShip.build({
        serialNumber: uuid(),
        // @ts-expect-error — fuelQuantity should be a number
        fuelQuantity: 'a lot',
        passengers: 3,
      });
    });

    describe('.clone', () => {
      it('should be possible to clone an instance ergonomically', () => {
        interface RocketShip {
          serialNumber: string;
          fuelQuantity: number;
          passengers: number;
        }
        class RocketShip
          extends DomainObject<RocketShip>
          implements RocketShip {}
        const ship = RocketShip.build({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });
        expect(ship).toBeInstanceOf(RocketShip); // sanity check

        // clone it
        const shipB = ship.clone();
        expect(shipB.fuelQuantity).toEqual(9001);
        const shipC = ship.clone({ fuelQuantity: 821 });
        expect(shipC.fuelQuantity).toEqual(821);
      });

      it('should reject updates with extra keys', () => {
        interface RocketShip {
          serialNumber: string;
          fuelQuantity: number;
          passengers: number;
        }
        class RocketShip
          extends DomainObject<RocketShip>
          implements RocketShip {}

        const ship = RocketShip.build({
          serialNumber: uuid(),
          fuelQuantity: 1000,
          passengers: 3,
        });

        // @ts-expect-error — unauthorizedKey is not valid
        ship.clone({ unauthorizedKey: true });
      });

      it('should reject updates with wrong value types', () => {
        interface RocketShip {
          serialNumber: string;
          fuelQuantity: number;
          passengers: number;
        }
        class RocketShip
          extends DomainObject<RocketShip>
          implements RocketShip {}

        const ship = RocketShip.build({
          serialNumber: uuid(),
          fuelQuantity: 1000,
          passengers: 3,
        });

        // @ts-expect-error — passengers should be a number
        ship.clone({ passengers: 'three' });
      });

      it('should preserve constructor.name and instanceof for simple domain objects', () => {
        interface RocketShip {
          serialNumber: string;
          fuelQuantity: number;
          passengers: number;
        }
        class RocketShip
          extends DomainObject<RocketShip>
          implements RocketShip {}

        const ship = RocketShip.build({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });

        const cloned = ship.clone();

        // This was returning 'Object' before the fix in withImmute.ts
        expect(cloned.constructor.name).toBe('RocketShip');
        expect(cloned instanceof RocketShip).toBe(true);
        expect(cloned).toBeInstanceOf(RocketShip);
      });

      it('should preserve constructor.name and instanceof for nested domain objects', () => {
        // define the plant pot
        interface PlantPot {
          diameterInInches: number;
        }
        class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

        // define the plant
        interface Plant {
          pot: PlantPot;
          lastWatered: string;
        }
        class Plant extends DomainObject<Plant> implements Plant {
          public static nested = { pot: PlantPot };
        }

        const plant = Plant.build({
          pot: { diameterInInches: 7 },
          lastWatered: 'monday',
        });

        const cloned = plant.clone({ lastWatered: 'tuesday' });

        // verify root object constructor is preserved
        expect(cloned.constructor.name).toBe('Plant');
        expect(cloned instanceof Plant).toBe(true);
        expect(cloned).toBeInstanceOf(Plant);

        // verify nested object constructor is preserved
        expect(cloned.pot.constructor.name).toBe('PlantPot');
        expect(cloned.pot instanceof PlantPot).toBe(true);
        expect(cloned.pot).toBeInstanceOf(PlantPot);
      });
    });
  });
});
