import { startDurationStopwatch } from '@ehmpathy/uni-time';
import Joi from 'joi';
import { z } from 'zod';

import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainLiteral } from '../../instantiation/DomainLiteral';
import { deserialize } from './deserialize';

/* eslint-disable no-useless-escape */
import { serialize } from './serialize';

describe('deserialize', () => {
  describe('basic types', () => {
    it('should deserialize strings', () => {
      const original = 'hello!';
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
    });
    it('should deserialize numbers', () => {
      const original = 821;
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
    });
    it.todo('should deserialize dates');
    it.todo('should deserialize undefined');
    it('should deserialize nulls', () => {
      const original = null;
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
    });
    it.todo('should deserialize buffers');
  });
  describe('arrays', () => {
    it('should be able to deserialize arrays', () => {
      const original = ['2', 'four', 1, 3];
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original); // sorted
    });
    it('should deserialize arrays even if they have objects', () => {
      const original = [
        'banana',
        821,
        { id: 0, meaning: null },
        { id: 1, meaning: 42, value: 821 },
      ];
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
    });
  });
  describe('objects', () => {
    it('should be able to serialize an object with all sorts of types', () => {
      const original = {
        color: 'blue',
        cost: 821,
        orders: [
          { id: 0, meaning: null },
          { id: 1, meaning: 42, value: 821 },
        ],
        application: {
          type: 'PAINTING',
        },
      };
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
    });
  });
  describe('domain objects', () => {
    // define some domain objects to test with
    interface Spaceship {
      serialNumber: string;
      fuelQuantity: number;
      passengers: number;
    }
    class Spaceship extends DomainEntity<Spaceship> implements Spaceship {
      public static unique = ['serialNumber'];
      public static updatable = ['serialNumber'];
      public static schema = Joi.object().keys({
        _dobj: Joi.string().optional(),
        serialNumber: Joi.string().required(),
        fuelQuantity: Joi.number().required(),
        passengers: Joi.number().required(),
      });
      // public static schema = z.object({ // !: zod is 3x faster than joi
      //   // _dobj: z.string().optional(),
      //   serialNumber: z.string(),
      //   fuelQuantity: z.number(),
      //   passengers: z.number().max(42),
      // });
    }
    interface Address {
      id?: number;
      galaxy: string;
      solarSystem: string;
      planet: string;
      continent: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}
    interface Spaceport {
      uuid: string;
      address: Address;
      spaceships: Spaceship[];
    }
    class Spaceport extends DomainEntity<Spaceport> implements Spaceport {
      public static unique = ['uuid'];
      public static updatable = ['spaceships'];
      public static nested = { address: Address, spaceships: Spaceship };
    }
    interface Human {
      birthCode: string;
      name: string;
    }
    class Human extends DomainEntity<Human> implements Human {
      public static unique = ['birthCode'];
      public static updatable = ['name'];
    }
    interface Robot {
      serialNumber: string;
      name: string;
    }
    class Robot extends DomainEntity<Robot> implements Robot {
      public static unique = ['serialNumber'];
      public static updatable = ['name'];
    }
    interface Captain {
      ship: Spaceship;
      agent: Robot | Human;
    }
    class Captain extends DomainEntity<Captain> implements Captain {
      public static unique = ['ship', 'agent'];
      public static nested = {
        ship: Spaceship,
        agent: [Robot, Human],
      };
    }

    // run the tests
    it('should deserialize domain objects', () => {
      const ship = new Spaceship({
        serialNumber: '__UUID__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const original = ship;
      const serial = serialize(original);
      const undone = deserialize(serial, { with: [Spaceship] });
      expect(undone).toEqual(original);
      expect(undone).toBeInstanceOf(Spaceship);
    });
    it('should throw a helpful error if attempted to deserialize a domain object without its constructor being provided in the context', () => {
      const ship = new Spaceship({
        serialNumber: '__UUID__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const original = ship;
      const serial = serialize(original);
      try {
        deserialize(serial, { with: [] });
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          `DomainObject 'Spaceship' was referenced in the string being deserialized but was missing from the context given to the deserialize method`,
        );
        expect(error.message).toMatchSnapshot(); // save an example of the message to snapshot
      }
    });
    it('recursively deserialize domain objects', () => {
      const shipA = new Spaceship({
        serialNumber: '__SHIP_A__',
        fuelQuantity: 7000,
        passengers: 42,
      });
      const shipB = new Spaceship({
        serialNumber: '__SHIP_B__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const spaceport = new Spaceport({
        uuid: '__SPACEPORT_UUID__',
        address: new Address({
          galaxy: 'Milky Way',
          solarSystem: 'Sun',
          planet: 'Earth',
          continent: 'North America',
        }),
        spaceships: [shipA, shipB],
      });
      const original = spaceport;
      const serial = serialize(original, { lossless: true });
      const undone = deserialize<Spaceport>(serial, {
        with: [Spaceport, Spaceship, Address],
      });
      expect(undone).toEqual(original);
      expect(undone).toBeInstanceOf(Spaceport);
      expect(undone.address).toBeInstanceOf(Address);
      expect(undone.spaceships[0]).toBeInstanceOf(Spaceship);
    });
    it('recursively deserialize an array of domain objects', () => {
      const shipA = new Spaceship({
        serialNumber: '__SHIP_A__',
        fuelQuantity: 7000,
        passengers: 42,
      });
      const shipB = new Spaceship({
        serialNumber: '__SHIP_B__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const original = [shipA, shipB];
      const serial = serialize(original, { lossless: true });
      const undone = deserialize<typeof original>(serial, {
        with: [Spaceport, Spaceship, Address],
      });
      expect(undone).toEqual(original);
      expect(undone[0]).toBeInstanceOf(Spaceship);
    });
    it('recursively deserialize a domain object which has a nested domain-object property instantiable with several options of domain objects', () => {
      const ship = new Spaceship({
        serialNumber: '__SHIP_A__',
        fuelQuantity: 7000,
        passengers: 42,
      });
      const agent = new Robot({
        serialNumber: '821',
        name: 'Bender',
      });
      const captain = new Captain({
        ship,
        agent,
      });
      const original = captain;
      const serial = serialize(original, { lossless: true });
      const undone = deserialize<typeof original>(serial, {
        with: [Spaceship, Human, Robot, Captain],
      });
      expect(undone).toEqual(original);
      expect(undone).toBeInstanceOf(Captain);
      expect(undone.agent).toBeInstanceOf(Robot);
    });
    describe('speed', () => {
      it('should be faster if schema is skipped', async () => {
        // define the choices
        const shipA = new Spaceship({
          serialNumber: '__SHIP_A__',
          fuelQuantity: 7000,
          passengers: 42,
        });
        const shipB = new Spaceship({
          serialNumber: '__SHIP_B__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const spaceport = new Spaceport({
          uuid: '__SPACEPORT_UUID__',
          address: new Address({
            galaxy: 'Milky Way',
            solarSystem: 'Sun',
            planet: 'Earth',
            continent: 'North America',
          }),
          spaceships: [shipA, shipB],
        });
        const agent = new Robot({
          serialNumber: '821',
          name: 'Bender',
        });
        const captainA = new Captain({
          ship: shipA,
          agent,
        });
        const captainB = new Captain({
          ship: shipB,
          agent,
        });

        // define many instances of domain objects
        const setSingle = [
          shipA,
          shipB,
          shipA,
          shipB,
          shipA,
          shipB,
          spaceport,
          agent,
          captainA,
          captainB,
        ];
        const setMany = Array(100).fill(setSingle).flat(); // 100 copies of set single

        // serialize the dobjs into a document
        const document = serialize(setMany, { lossless: true });
        console.log(document);

        // check the deserialize duration with schema
        const stopwatchWithSchema = startDurationStopwatch(
          {
            for: 'deserialize with schema',
            log: {
              level: 'info',
              threshold: { milliseconds: 1 },
            },
          },
          { log: console },
        );
        await deserialize(document, {
          with: [Spaceship, Spaceport, Robot, Captain],
        });
        const { duration: durationWithSchema } = stopwatchWithSchema.stop();

        // check the deserialize duration without schema
        const stopwatchWithoutSchema = startDurationStopwatch(
          {
            for: 'deserialize with schema',
            log: {
              level: 'info',
              threshold: { milliseconds: 1 },
            },
          },
          { log: console },
        );
        await deserialize(document, {
          with: [Spaceship, Spaceport, Robot, Captain],
          skip: {
            schema: true,
          },
        });
        const { duration: durationWithoutSchema } =
          stopwatchWithoutSchema.stop();
        expect(durationWithoutSchema.milliseconds).toBeLessThan(
          durationWithSchema.milliseconds,
        );
      });
    });
  });
});
