import Joi from 'joi';
import { v4 as uuid } from 'uuid';
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
    });
  });

  describe('.build', () => {
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
    });
  });
});
