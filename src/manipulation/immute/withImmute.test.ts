import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { withImmute } from './withImmute';

// test fixtures
interface Address {
  street: string;
  city: string;
}
class Address extends DomainLiteral<Address> implements Address {}

interface Captain {
  uuid?: string;
  name: string;
}
class Captain extends DomainEntity<Captain> implements Captain {
  public static unique = ['name'] as const;
}

interface RocketShip {
  uuid?: string;
  serialNumber: string;
  homeAddress: Address;
  captain: Captain | null;
}
class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
  public static unique = ['serialNumber'] as const;
  public static nested = { homeAddress: Address, captain: Captain };
}

describe('withImmute', () => {
  describe('withImmute.singular', () => {
    it('should add .clone() to a single object only', () => {
      const address = new Address({ street: '123 Main', city: 'Austin' });
      const ship = new RocketShip({
        serialNumber: 'SN1',
        homeAddress: address,
        captain: null,
      });

      // apply singular withImmute
      const result = withImmute.singular(ship);

      // parent should have .clone()
      expect(typeof result.clone).toEqual('function');

      // nested should NOT have .clone() (singular = shallow)
      expect((result.homeAddress as any).clone).toBeUndefined();
    });

    it('should be idempotent - safe to call multiple times', () => {
      const address = new Address({ street: '123 Main', city: 'Austin' });

      // call singular twice
      withImmute.singular(address);
      const result = withImmute.singular(address);

      // should not throw, should still have .clone()
      expect(typeof result.clone).toEqual('function');
    });
  });

  describe('withImmute.recursive', () => {
    it('should add .clone() to all domain objects in tree', () => {
      const address = new Address({ street: '123 Main', city: 'Austin' });
      const captain = new Captain({ name: 'Kirk' });
      const ship = new RocketShip({
        serialNumber: 'SN1',
        homeAddress: address,
        captain,
      });

      // apply recursive withImmute
      const result = withImmute.recursive(ship);

      // parent should have .clone()
      expect(typeof result.clone).toEqual('function');

      // nested Address should have .clone()
      expect(typeof (result.homeAddress as any).clone).toEqual('function');

      // nested Captain should have .clone()
      expect(typeof (result.captain as any).clone).toEqual('function');
    });

    it('should not add .clone() to plain objects', () => {
      const plainObj = { foo: 'bar', nested: { baz: 123 } };

      // apply recursive withImmute
      const result = withImmute.recursive(plainObj);

      // plain objects should not have .clone()
      expect((result as any).clone).toBeUndefined();
      expect((result.nested as any).clone).toBeUndefined();
    });

    it('should handle arrays of domain objects', () => {
      const addresses = [
        new Address({ street: '123 Main', city: 'Austin' }),
        new Address({ street: '456 Oak', city: 'Dallas' }),
      ];

      // apply recursive withImmute
      const result = withImmute.recursive(addresses);

      // each element should have .clone()
      result.forEach((addr) => {
        expect(typeof (addr as any).clone).toEqual('function');
      });
    });

    it('should be idempotent - safe to call multiple times', () => {
      const address = new Address({ street: '123 Main', city: 'Austin' });
      const ship = new RocketShip({
        serialNumber: 'SN1',
        homeAddress: address,
        captain: null,
      });

      // call recursive twice
      withImmute.recursive(ship);
      const result = withImmute.recursive(ship);

      // should not throw, should still have .clone()
      expect(typeof result.clone).toEqual('function');
      expect(typeof (result.homeAddress as any).clone).toEqual('function');
    });
  });

  describe('withImmute (default)', () => {
    it('should behave the same as withImmute.recursive', () => {
      const address = new Address({ street: '123 Main', city: 'Austin' });
      const captain = new Captain({ name: 'Kirk' });
      const ship = new RocketShip({
        serialNumber: 'SN1',
        homeAddress: address,
        captain,
      });

      // apply default withImmute
      const result = withImmute(ship);

      // should have recursive behavior
      expect(typeof result.clone).toEqual('function');
      expect(typeof (result.homeAddress as any).clone).toEqual('function');
      expect(typeof (result.captain as any).clone).toEqual('function');
    });
  });

  describe('nested domain objects via constructor (usecase.8)', () => {
    it('should have .clone() on parent when constructed with nested props', () => {
      const ship = RocketShip.build({
        serialNumber: 'SN1',
        homeAddress: { street: '123 Main', city: 'Austin' },
        captain: null,
      });

      expect(typeof ship.clone).toEqual('function');
    });

    it('should have .clone() on nested child when constructed with nested props', () => {
      const ship = RocketShip.build({
        serialNumber: 'SN1',
        homeAddress: { street: '123 Main', city: 'Austin' },
        captain: { name: 'Kirk' },
      });

      expect(typeof (ship.homeAddress as any).clone).toEqual('function');
      expect(typeof (ship.captain as any).clone).toEqual('function');
    });
  });
});
