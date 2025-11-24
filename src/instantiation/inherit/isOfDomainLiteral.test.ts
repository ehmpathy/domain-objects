import { DomainEntity } from '../DomainEntity';
import { DomainLiteral } from '../DomainLiteral';
import { isOfDomainLiteral } from './isOfDomainLiteral';

describe('isOfDomainLiteral', () => {
  it('should return true for DomainLiteral instances', () => {
    interface Address {
      street: string;
      city: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}

    const address = new Address({ street: '123 Main St', city: 'Portland' });
    expect(isOfDomainLiteral(address)).toBe(true);
  });

  it('should return false for DomainEntity instances', () => {
    interface User {
      uuid: string;
      name: string;
    }
    class User extends DomainEntity<User> implements User {
      public static primary = ['uuid'] as const;
      public static unique = ['uuid'] as const;
      public static updatable = ['name'] as const;
    }

    const user = new User({ uuid: '123', name: 'Alice' });
    expect(isOfDomainLiteral(user)).toBe(false);
  });

  it('should return false for plain objects', () => {
    const plainObject = { street: '123 Main St', city: 'Portland' };
    expect(isOfDomainLiteral(plainObject)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isOfDomainLiteral('string')).toBe(false);
    expect(isOfDomainLiteral(123)).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isOfDomainLiteral(null)).toBe(false);
    expect(isOfDomainLiteral(undefined)).toBe(false);
  });

  it('should support cross-version compatibility via symbol marker', () => {
    // Simulate a class from a different version that has the marker
    const mark = Symbol.for('domain-objects/DomainLiteral');
    class LegacyDomainLiteral {
      public static readonly [mark] = '0.20.0'; // Old version
      constructor(public street: string, public city: string) {}
    }

    const legacy = new LegacyDomainLiteral('123 Main St', 'Portland');
    expect(isOfDomainLiteral(legacy)).toBe(true);
  });
});
