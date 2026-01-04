import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { isOfDomainEntity } from './isOfDomainEntity';

describe('isOfDomainEntity', () => {
  it('should return true for DomainEntity instances', () => {
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
    expect(isOfDomainEntity(user)).toBe(true);
  });

  it('should return false for DomainLiteral instances', () => {
    interface Address {
      street: string;
      city: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}

    const address = new Address({ street: '123 Main St', city: 'Portland' });
    expect(isOfDomainEntity(address)).toBe(false);
  });

  it('should return false for plain objects', () => {
    const plainObject = { uuid: '123', name: 'Alice' };
    expect(isOfDomainEntity(plainObject)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isOfDomainEntity('string')).toBe(false);
    expect(isOfDomainEntity(123)).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isOfDomainEntity(null)).toBe(false);
    expect(isOfDomainEntity(undefined)).toBe(false);
  });

  it('should support cross-version compatibility via symbol marker', () => {
    // Simulate a class from a different version that has the marker
    const mark = Symbol.for('domain-objects/DomainEntity');
    class LegacyDomainEntity {
      public static readonly [mark] = '0.20.0'; // Old version
      constructor(
        public uuid: string,
        public name: string,
      ) {}
    }

    const legacy = new LegacyDomainEntity('123', 'Alice');
    expect(isOfDomainEntity(legacy)).toBe(true);
  });
});
