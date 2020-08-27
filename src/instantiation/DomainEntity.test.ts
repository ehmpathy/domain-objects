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
    class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
      public static unique = ['serialNumber'];
      public static updatable = ['serialNumber'];
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
