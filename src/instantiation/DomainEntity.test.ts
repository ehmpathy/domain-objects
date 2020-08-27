import uuid from 'uuid';
import { DomainEntity } from './DomainEntity';
import { DomainObject } from './DomainObject';

describe('DomainEntity', () => {
  it('should be able to represent an entity', () => {
    interface RocketShip {
      serialNumber: string;
      fuelQuantity: number;
      passengers: number;
    }
    const unique = ['serialNumber'] as const;
    const updatable = ['fuelQuantity', 'passengers'] as const;

    type UniqueIdentifier<T, U extends keyof T> = Pick<T, U>;

    interface RocketShipUniqueIdentifier extends UniqueIdentifier<RocketShip, typeof unique[number]> {} // eslint-disable-line @typescript-eslint/no-empty-interface
    class RocketShipUniqueIdentifier extends DomainObject<RocketShipUniqueIdentifier> implements RocketShipUniqueIdentifier {}

    class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
      public static unique = unique;
      public static updatable = updatable;
      public static UniqueIdentifier = RocketShipUniqueIdentifier;
    }
    const ship = new RocketShip({
      serialNumber: uuid(),
      fuelQuantity: 9001,
      passengers: 21,
    });
    expect(ship).toBeInstanceOf(RocketShip); // sanity check
    expect(ship).toBeInstanceOf(DomainObject); // should also be instance of this, since extends it
  });
  it('should be spreadable', () => {
    interface RocketShip {
      serialNumber: string;
      fuelQuantity: number;
      passengers: number;
    }
    class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
      public static unique = ['serialNumber'];
      public static updatable = ['fuelQuantity', 'passengers'];
    }
    const ship = new RocketShip({
      serialNumber: uuid(),
      fuelQuantity: 9001,
      passengers: 21,
    });
    const updatedShip = new RocketShip({ ...ship, passengers: 27 });
    expect(updatedShip.fuelQuantity).toEqual(9001); // sanity check
  });
});
