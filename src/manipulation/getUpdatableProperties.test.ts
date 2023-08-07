import { v4 as uuid } from 'uuid';

import { DomainObjectNotSafeToManipulateError } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEntityUpdatablePropertiesMustBeDefinedError } from './DomainEntityUpdatablePropertiesMustBeDefinedError';
import { getUpdatableProperties } from './getUpdatableProperties';

describe('getUpdatableProperties', () => {
  describe('entity', () => {
    it('should be able to get updatable properties accurately', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
        public static updatable = ['fuelQuantity', 'passengers'];
      }
      const ship = new RocketShip({
        serialNumber: 'SN5',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const updatableProps = getUpdatableProperties(ship);
      expect(updatableProps).toEqual({ fuelQuantity: 9001, passengers: 21 });
    });
    it('should throw an error if .updatable is not defined on the entity', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {}
      const ship = new RocketShip({
        serialNumber: 'SN5',
        fuelQuantity: 9001,
        passengers: 21,
      });
      try {
        getUpdatableProperties(ship);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          '`RocketShip.updatable` must be defined, to be able to `getUpdatableProperties`',
        );
        expect(error).toBeInstanceOf(
          DomainEntityUpdatablePropertiesMustBeDefinedError,
        );
      }
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
        public static updatable = ['passengerLimit'];
      }
      const phone = new Plane({
        uuid: uuid(),
        manufacturer: { name: 'boeing' },
        passengerLimit: 821,
      });
      try {
        getUpdatableProperties(phone);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainObjectNotSafeToManipulateError);
      }
    });
  });
});
