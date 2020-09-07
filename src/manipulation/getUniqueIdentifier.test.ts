import uuid from 'uuid';

import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainValueObject } from '../instantiation/DomainValueObject';
import { getUniqueIdentifier } from './getUniqueIdentifier';
import { DomainObjectNotSafeToManipulateError } from '../constraints/assertDomainObjectIsSafeToManipulate';

describe('getUniqueIdentifier', () => {
  describe('value object', () => {
    it('should be able to get unique identifier accurately', () => {
      interface Address {
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainValueObject<Address> implements Address {}
      const address = new Address({ street: '123 Elm Street', city: 'Austin', state: 'TX', postal: '78704' });
      const unique = getUniqueIdentifier(address);
      expect(unique).toEqual({ street: '123 Elm Street', city: 'Austin', state: 'TX', postal: '78704' });
    });
    it('should exclude uuid and id, if present', () => {
      interface Address {
        id?: number;
        uuid?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainValueObject<Address> implements Address {}
      const address = new Address({ id: 821, uuid: '__UUID__', street: '123 Elm Street', city: 'Austin', state: 'TX', postal: '78704' });
      const unique = getUniqueIdentifier(address);
      expect(unique).toEqual({ street: '123 Elm Street', city: 'Austin', state: 'TX', postal: '78704' });
    });
  });
  describe('entity', () => {
    it('should be able to get unique identifier accurately', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
        public static unique = ['serialNumber'];
        public static updatable = ['fuelQuantity', 'passengers'];
      }
      const ship = new RocketShip({ serialNumber: 'SN5', fuelQuantity: 9001, passengers: 21 });
      const uniqueIdentifier = getUniqueIdentifier(ship);
      expect(uniqueIdentifier).toEqual({ serialNumber: 'SN5' });
    });
    it('should throw an error if .unique is not defined on the entity', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {}
      const ship = new RocketShip({ serialNumber: 'SN5', fuelQuantity: 9001, passengers: 21 });
      try {
        getUniqueIdentifier(ship);
        throw new Error('should not reach here');
      } catch (error) {
        expect(error.message).toEqual('`RocketShip.unique` must be defined, to be able to `getUniqueIdentifier`');
      }
    });
    it('should be able to get unique identifier accurately', () => {
      interface SmartPhone {
        uuid: string;
        manufacturer: string;
        brand: string;
        model: string;
        os: string;
        carrier: string;
      }
      class SmartPhone extends DomainEntity<SmartPhone> implements SmartPhone {
        public static unique = ['manufacturer', 'brand', 'model'];
        public static updatable = ['os', 'carrier'];
      }
      const phone = new SmartPhone({
        uuid: '__UUID__',
        manufacturer: 'Google',
        brand: 'Pixel',
        model: 'Pixel 3a',
        os: 'Android',
        carrier: 'Verizon',
      });
      const uniqueIdentifier = getUniqueIdentifier(phone);
      expect(uniqueIdentifier).toEqual({
        manufacturer: 'Google',
        brand: 'Pixel',
        model: 'Pixel 3a',
      });
    });
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
        getUniqueIdentifier(phone);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainObjectNotSafeToManipulateError);
      }
    });
  });
});
