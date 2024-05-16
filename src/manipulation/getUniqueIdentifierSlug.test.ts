import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { getUniqueIdentifierSlug } from './getUniqueIdentifierSlug';

describe('getUniqueIdentifierSlug', () => {
  it('should look reasonable for a literal', () => {
    interface Address {
      street: string;
      suite?: string;
      city: string;
      state: string;
      postal: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}
    const address = new Address({
      street: '123 Elm Street',
      city: 'Austin',
      state: 'TX',
      postal: '78704',
    });
    const slug = getUniqueIdentifierSlug(address);
    expect(slug).toEqual(
      'Address.Austin.78704.TX.123ElmStreet.e3e858b5d0a134d71970398358e8601acd48a3c7b06f17beadf56319242e180c',
    );
  });
  it('should look reasonable for an entity', () => {
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
      serialNumber: 'SN5',
      fuelQuantity: 9001,
      passengers: 21,
    });
    const slug = getUniqueIdentifierSlug(ship);
    expect(slug).toEqual(
      'RocketShip.SN5.88b02544d3a4e5eb8e803136027931f0d54cb5d6f77ec0e8906afe61928b8046',
    );
  });
});
