import uuid from 'uuid';
import { DomainObject } from '../..';

import { DomainObjectNotSafeToManipulateError } from '../../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainValueObject } from '../../instantiation/DomainValueObject';
/* eslint-disable no-useless-escape */
import { serialize } from './serialize';

describe('serialize', () => {
  describe('basic types', () => {
    it('should serialize strings', () => {
      const serial = serialize('hello!');
      expect(serial).toEqual('"hello!"');
    });
    it('should serialize numbers', () => {
      const serial = serialize(821);
      expect(serial).toEqual('821');
    });
    it('should serialize dates', () => {
      const serial = serialize(new Date('2020-08-21 00:00:00'));
      expect(serial).toContain('Fri Aug 21 2020 00:00:00');
    });
    it('should serialize undefined', () => {
      const serial = serialize(undefined);
      expect(serial).toEqual(undefined);
    });
    it('should serialize nulls', () => {
      const serial = serialize(null);
      expect(serial).toEqual('null');
    });
    it('should serialize buffers', () => {
      const serial = serialize(Buffer.from('821'));
      expect(serial).toEqual('"821"');
    });
  });
  describe('arrays', () => {
    it('should be able to serialize arrays', () => {
      const serial = serialize(['821', 721, 'leopard', 7, 'apple', 3]);
      expect(serial).toEqual(`[\"821"\,\"apple\",\"leopard\",3,7,721]`); // note that it sorts them
    });
    it('should serialize them deterministically - independent of order of values', () => {
      const serialA = serialize([3, '821', 721, 'leopard', 'apple']);
      const serialB = serialize([721, 'leopard', 3, 'apple', '821']);
      expect(serialB).toEqual(serialA); // should be equivalent, since it serializes deterministically by value (due to sorting)
    });
    it('should serialize arrays even if they have objects - still deterministically', () => {
      const serialA = serialize([
        'banana',
        { id: 1, value: 821, meaning: 42 },
        821,
        { id: 0, value: undefined, meaning: null }, // should go first, because id is 0
      ]);
      const serialB = serialize([
        { id: 0, value: undefined, meaning: null }, // should go first, because id is 0
        { id: 1, value: 821, meaning: 42 },
        821,
        'banana',
      ]);
      expect(serialB).toEqual(serialA); // should be equivalent
    });
  });
  describe('objects', () => {
    it('should be able to serialize an object with all sorts of types', () => {
      const serial = serialize({
        color: 'blue',
        cost: 821,
        orders: [
          { id: 1, value: 821, meaning: 42 },
          { id: 0, value: undefined, meaning: null },
        ],
        application: {
          type: 'PAINTING',
        },
      });
      expect(serial).toEqual(
        // note that it sorts them
        `{"application":{"type":"PAINTING"},"color":"blue","cost":821,"orders":[{"id":0,"meaning":null},{"id":1,"meaning":42,"value":821}]}`,
      );
    });
    it('should sort object keys, for determinism', () => {
      const serialA = serialize({
        color: 'blue',
        application: 821,
      });
      const serialB = serialize({
        application: 821,
        color: 'blue',
      });
      expect(serialA).toEqual(serialB); // should show that they're equivalent, due to sorting
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
    }
    interface Address {
      id?: number;
      galaxy: string;
      solarSystem: string;
      planet: string;
      continent: string;
    }
    class Address extends DomainValueObject<Address> implements Address {}
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

    // run the tests
    it('should add the domain object name as metadata', () => {
      const ship = new Spaceship({
        serialNumber: '__UUID__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const serial = serialize(ship);
      expect(serial).toContain('Spaceship');
      expect(serial).toEqual(`{\"_dobj\":\"Spaceship\",\"fuelQuantity\":9001,\"passengers\":21,\"serialNumber\":\"__UUID__\"}`);
    });
    it('should add the domain object name as metadata recursively, for all nested domain objects too', () => {
      const shipA = new Spaceship({
        serialNumber: '__SHIP_A__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const shipB = new Spaceship({
        serialNumber: '__SHIP_B__',
        fuelQuantity: 7000,
        passengers: 42,
      });
      const spaceport = new Spaceport({
        uuid: '__SPACEPORT_UUID__',
        address: new Address({ galaxy: 'Milky Way', solarSystem: 'Sun', planet: 'Earth', continent: 'North America' }),
        spaceships: [shipA, shipB],
      });
      const serial = serialize(spaceport);

      // check that it has the metadata on there, specifying which domain object each object was
      expect(serial).toContain('Spaceship');
      expect(serial).toContain('Address');
      expect(serial).toContain('Spaceport');

      // and then record a snapshot, just so we can see how it looks as a visual example
      expect(JSON.parse(serial)).toMatchSnapshot();
    });
    it('should replace each nested domain object with its unique representation, so that updates to the non-unique properties of referenced entities dont affect comparisons', () => {
      const shipA = new Spaceship({
        serialNumber: '__SHIP_A__',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const shipB = new Spaceship({
        serialNumber: '__SHIP_B__',
        fuelQuantity: 7000,
        passengers: 42,
      });
      const spaceport = new Spaceport({
        uuid: '__SPACEPORT_UUID__',
        address: new Address({ id: 821, galaxy: 'Milky Way', solarSystem: 'Sun', planet: 'Earth', continent: 'North America' }),
        spaceships: [shipA, shipB],
      });
      const serialA = serialize(spaceport);

      // now define spaceport again, but this time the fuel quantity of shipB has decreased (since it was flying)
      spaceport.spaceships[1].fuelQuantity = 4200;
      const serialB = serialize(spaceport);

      // we should not be tracking "fuelQuantity" or "passengers", because those properties are updatable and in domain modeling, we only care about which domain objects are being referenced (i.e., bounded scope of consideration) - not what state referenced object's updatable properties are in; that's why we only care about spaceship.serialNumber here, since that uniquely identifies the spaceship being referenced
      expect(serialA).not.toContain('fuelQuantity');
      expect(serialA).not.toContain('passengers');

      // note, we should still be tracking all parts of the address (except id) - since those are required to uniquely identify the address
      expect(serialA).toContain('galaxy');
      expect(serialA).toContain('solarSystem');
      expect(serialA).toContain('planet');
      expect(serialA).toContain('continent');

      // their serials should be equivalent, because, due to domain modeling, we know that those two space ports are still the same (i.e., they reference the same ships, even though the ship's updatable properties have changed!)
      expect(serialB).toEqual(serialA);
    });

    interface GlowWorm {
      glowing: boolean;
      color: string;
    }
    class GlowWorm extends DomainObject<GlowWorm> implements GlowWorm {}
    it('should not throw an error trying to serialize a safe generic domain object', () => {
      const worm = new GlowWorm({
        glowing: true,
        color: 'purple',
      });
      const serial = serialize(worm);
      expect(serial).toContain('GlowWorm');
      expect(serial).toEqual(`{\"_dobj\":\"GlowWorm\",\"color\":\"purple\",\"glowing\":true}`);
    });

    describe('safety', () => {
      it('should throw an error if domain object is not safe to manipulate', () => {
        interface PlaneManufacturer {
          name: string;
        }
        interface Plane {
          uuid: string;
          manufacturer: PlaneManufacturer;
          passengerLimit: number;
        }
        class Plane extends DomainEntity<Plane> implements Plane {
          public static unique = ['uuid'];
        }
        const phone = new Plane({
          uuid: uuid(),
          manufacturer: { name: 'boeing' },
          passengerLimit: 821,
        });
        try {
          serialize(phone);
        } catch (error) {
          expect(error).toBeInstanceOf(DomainObjectNotSafeToManipulateError);
        }
      });
    });
  });
});
