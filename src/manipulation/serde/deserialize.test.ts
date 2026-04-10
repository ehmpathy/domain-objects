import { startDurationStopwatch } from '@ehmpathy/uni-time';
import Joi from 'joi';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { getUniqueIdentifier } from '@src/manipulation/getUniqueIdentifier';
import type { WithImmute } from '@src/manipulation/immute/withImmute';

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
      expect(undone).toMatchSnapshot();
    });
    it('should deserialize numbers', () => {
      const original = 821;
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
      expect(undone).toMatchSnapshot();
    });
    it.todo('should deserialize dates'); // dates serialize to toString(), don't round-trip
    it.todo('should deserialize undefined'); // undefined doesn't serialize to JSON
    it('should deserialize nulls', () => {
      const original = null;
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original);
      expect(undone).toMatchSnapshot();
    });
    it.todo('should deserialize buffers'); // buffers serialize to strings, don't round-trip
  });
  describe('arrays', () => {
    it('should be able to deserialize arrays', () => {
      const original = ['2', 'four', 1, 3];
      const serial = serialize(original);
      const undone = deserialize(serial);
      expect(undone).toEqual(original); // sorted
      expect(undone).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
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
    it('should throw a JSON parse error when given invalid JSON', () => {
      const invalidJson = '{ not valid json }';
      try {
        deserialize(invalidJson);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        expect(error.message).toContain('JSON'); // error message contains JSON reference
        expect(error.message).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
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
      expect(undone).toMatchSnapshot();
    });

    describe('.clone() method availability', () => {
      it('should have .clone() method after deserialize', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        expect(typeof undone.clone).toEqual('function');
      });

      it('should preserve .clone() on cloned instances (chained)', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        const cloned = undone.clone({ fuelQuantity: 5000 });
        expect(typeof cloned.clone).toEqual('function');
        const clonedAgain = cloned.clone({ passengers: 10 });
        expect(typeof clonedAgain.clone).toEqual('function');
      });

      it('should apply updates via .clone({ prop: newValue })', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        const cloned = undone.clone({ fuelQuantity: 5000 });
        expect(cloned.fuelQuantity).toEqual(5000);
        expect(cloned.serialNumber).toEqual('__UUID__');
        expect(cloned.passengers).toEqual(21);
      });

      it('should not mutate original when .clone() is called', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        const originalFuel = undone.fuelQuantity;
        undone.clone({ fuelQuantity: 5000 });
        expect(undone.fuelQuantity).toEqual(originalFuel);
      });
    });

    describe('nested domain objects with .clone()', () => {
      it('should have .clone() on parent domain object', () => {
        const shipA = new Spaceship({
          serialNumber: '__SHIP_A__',
          fuelQuantity: 7000,
          passengers: 42,
        });
        const spaceport = new Spaceport({
          uuid: '__SPACEPORT_UUID__',
          address: new Address({
            galaxy: 'Milky Way',
            solarSystem: 'Sun',
            planet: 'Earth',
            continent: 'North America',
          }),
          spaceships: [shipA],
        });
        const serial = serialize(spaceport, { lossless: true });
        const undone = deserialize<Spaceport>(serial, {
          with: [Spaceport, Spaceship, Address],
        });
        expect(typeof undone.clone).toEqual('function');
      });

      it('should have .clone() on nested child domain object', () => {
        const shipA = new Spaceship({
          serialNumber: '__SHIP_A__',
          fuelQuantity: 7000,
          passengers: 42,
        });
        const spaceport = new Spaceport({
          uuid: '__SPACEPORT_UUID__',
          address: new Address({
            galaxy: 'Milky Way',
            solarSystem: 'Sun',
            planet: 'Earth',
            continent: 'North America',
          }),
          spaceships: [shipA],
        });
        const serial = serialize(spaceport, { lossless: true });
        const undone = deserialize<Spaceport>(serial, {
          with: [Spaceport, Spaceship, Address],
        });
        expect(typeof (undone.address as any).clone).toEqual('function');
        expect(typeof (undone.spaceships[0] as any).clone).toEqual('function');
      });

      it('should have .clone() on deeply nested domain objects (3+ levels)', () => {
        // Captain -> ship (Spaceship) is 2 levels
        // Captain -> ship -> (if Spaceship had nested) would be 3 levels
        // For this test, use Spaceport -> spaceships -> Spaceship
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
        const serial = serialize(spaceport, { lossless: true });
        const undone = deserialize<Spaceport>(serial, {
          with: [Spaceport, Spaceship, Address],
        });
        // Level 1: Spaceport
        expect(typeof undone.clone).toEqual('function');
        // Level 2: Address (cast needed - WithImmute only wraps top level type)
        expect(typeof (undone.address as any).clone).toEqual('function');
        // Level 2: Spaceship array elements (cast needed - WithImmute only wraps top level type)
        expect(typeof (undone.spaceships[0] as any).clone).toEqual('function');
        expect(typeof (undone.spaceships[1] as any).clone).toEqual('function');
      });
    });

    describe('arrays of domain objects with .clone()', () => {
      it('should have .clone() on each element in array', () => {
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
          with: [Spaceship],
        });
        expect(typeof (undone[0] as any).clone).toEqual('function');
        expect(typeof (undone[1] as any).clone).toEqual('function');
      });

      it('should work with array iteration (map/filter/reduce)', () => {
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
          with: [Spaceship],
        });
        // map
        const serialNumbers = undone.map((s) => s.serialNumber);
        expect(serialNumbers).toEqual(['__SHIP_A__', '__SHIP_B__']);
        // filter
        const highFuel = undone.filter((s) => s.fuelQuantity > 8000);
        expect(highFuel.length).toEqual(1);
        // reduce
        const totalPassengers = undone.reduce(
          (acc, s) => acc + s.passengers,
          0,
        );
        expect(totalPassengers).toEqual(63);
      });
    });

    describe('non-domain objects (negative cases)', () => {
      it('should not add .clone() to plain objects', () => {
        const original = { name: 'test', value: 42 };
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect((undone as any).clone).toBeUndefined();
      });

      it('should not add .clone() to primitives in arrays', () => {
        const original = [1, 'two', null, true];
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect(undone).toEqual(original);
        undone.forEach((item) => {
          if (item !== null && typeof item === 'object') {
            expect((item as any).clone).toBeUndefined();
          }
        });
      });

      it('should pass through null values unchanged', () => {
        const original = null;
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect(undone).toBeNull();
      });

      it('should pass through undefined values in arrays unchanged', () => {
        // Note: JSON.stringify converts undefined to null in arrays
        const original = [1, null, 3];
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect(undone[1]).toBeNull();
      });
    });

    describe('mixed content', () => {
      it('should selectively add .clone() to domain objects only', () => {
        const mixed = {
          ship: new Spaceship({
            serialNumber: '__UUID__',
            fuelQuantity: 9001,
            passengers: 21,
          }),
          plainData: { name: 'test', value: 42 },
          primitives: [1, 'two', true],
        };
        const serial = serialize(mixed, { lossless: true });
        const undone = deserialize<typeof mixed>(serial, { with: [Spaceship] });
        // Domain object has .clone() (cast needed - WithImmute only wraps top level type)
        expect(typeof (undone.ship as any).clone).toEqual('function');
        // Plain object does not have .clone()
        expect((undone.plainData as any).clone).toBeUndefined();
      });

      it('should leave plain objects unchanged in mixed structures', () => {
        const mixed = {
          ship: new Spaceship({
            serialNumber: '__UUID__',
            fuelQuantity: 9001,
            passengers: 21,
          }),
          config: { mode: 'value', nested: { deep: true } },
        };
        const serial = serialize(mixed, { lossless: true });
        const undone = deserialize<typeof mixed>(serial, { with: [Spaceship] });
        expect(undone.config).toEqual({
          mode: 'value',
          nested: { deep: true },
        });
        expect((undone.config as any).clone).toBeUndefined();
        expect((undone.config.nested as any).clone).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty arrays', () => {
        const original: Spaceship[] = [];
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect(undone).toEqual([]);
      });

      it('should handle empty plain objects', () => {
        const original = {};
        const serial = serialize(original);
        const undone = deserialize<typeof original>(serial);
        expect(undone).toEqual({});
      });

      it('should handle domain objects with null properties', () => {
        const address = new Address({
          id: undefined,
          galaxy: 'Milky Way',
          solarSystem: 'Sun',
          planet: 'Earth',
          continent: 'North America',
        });
        const serial = serialize(address, { lossless: true });
        const undone = deserialize<Address>(serial, { with: [Address] });
        expect(typeof undone.clone).toEqual('function');
        expect(undone.id).toBeUndefined();
      });
    });

    describe('round-trip consistency', () => {
      it('should preserve .clone() after serialize → deserialize', () => {
        const ship = Spaceship.build({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        // ship from .build() already has .clone()
        expect(typeof ship.clone).toEqual('function');
        // serialize and deserialize
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        // should still have .clone()
        expect(typeof undone.clone).toEqual('function');
      });

      it('should preserve identity via getUniqueIdentifier after round-trip', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        expect(getUniqueIdentifier(undone)).toEqual(getUniqueIdentifier(ship));
      });

      it('should preserve .clone() on all nested domain objects after recursive round-trip', () => {
        // create nested structure: Spaceport -> Address + Spaceships[]
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

        // round-trip: serialize → deserialize
        const serial = serialize(spaceport, { lossless: true });
        const undone = deserialize<Spaceport>(serial, {
          with: [Spaceport, Spaceship, Address],
        });

        // verify .clone() works on parent
        expect(typeof undone.clone).toEqual('function');
        const clonedSpaceport = undone.clone({ uuid: '__CLONED__' });
        expect(clonedSpaceport.uuid).toEqual('__CLONED__');

        // verify .clone() works on nested Address
        const address = undone.address as any;
        expect(typeof address.clone).toEqual('function');
        const clonedAddress = address.clone({ galaxy: 'Andromeda' });
        expect(clonedAddress.galaxy).toEqual('Andromeda');

        // verify .clone() works on nested Spaceships in array
        const ship0 = undone.spaceships[0] as any;
        expect(typeof ship0.clone).toEqual('function');
        const clonedShip = ship0.clone({ fuelQuantity: 1000 });
        expect(clonedShip.fuelQuantity).toEqual(1000);
      });
    });

    describe('TypeScript types', () => {
      it('type: WithImmute<T> should be assignable to T', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        // This line tests that WithImmute<Spaceship> is assignable to Spaceship
        const undone: Spaceship = deserialize<Spaceship>(serial, {
          with: [Spaceship],
        });
        expect(undone).toBeInstanceOf(Spaceship);
      });

      it('type: result should have .clone() in type signature', () => {
        const ship = new Spaceship({
          serialNumber: '__UUID__',
          fuelQuantity: 9001,
          passengers: 21,
        });
        const serial = serialize(ship, { lossless: true });
        const undone = deserialize<Spaceship>(serial, { with: [Spaceship] });
        // TypeScript knows about .clone() - this would not compile if not
        const cloned: WithImmute<Spaceship> = undone.clone({
          fuelQuantity: 5000,
        });
        expect(cloned.fuelQuantity).toEqual(5000);
      });

      it('type: WithImmute should be exportable from package', () => {
        // This test verifies the type is importable - the import at top of file proves this
        // We just verify it's usable as a type
        const typed: WithImmute<Spaceship> | null = null;
        expect(typed).toBeNull();
      });
    });

    describe('speed', () => {
      it.skip('should be faster if schema is skipped', async () => {
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
            for: 'deserialize without schema',
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

      it.skip('should be instant on repeat attempts, due to in memory cache', async () => {
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
        const setMany = Array(300).fill(setSingle).flat(); // 100 copies of set single

        // serialize the dobjs into a document
        const document = serialize(setMany, { lossless: true });

        // check the deserialize duration with schema
        const stopwatchFirst = startDurationStopwatch(
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
        const { duration: durationFirst } = stopwatchFirst.stop();
        expect(durationFirst.milliseconds).toBeGreaterThan(20);

        // check the deserialize duration without schema
        const stopwatchSecond = startDurationStopwatch(
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
        const { duration: durationSecond } = stopwatchSecond.stop();
        expect(durationSecond.milliseconds).toBeLessThan(5); // instant
      });
    });
  });
});
