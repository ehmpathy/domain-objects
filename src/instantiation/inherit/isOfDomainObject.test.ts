import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainEvent } from '@src/instantiation/DomainEvent';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { DomainObject } from '@src/instantiation/DomainObject';

import { isOfDomainObject } from './isOfDomainObject';

describe('isOfDomainObject', () => {
  it('should return true for DomainObject instances', () => {
    interface Car {
      make: string;
      model: string;
    }
    class Car extends DomainObject<Car> implements Car {}

    const car = new Car({ make: 'Toyota', model: 'Camry' });
    expect(isOfDomainObject(car)).toBe(true);
  });

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
    expect(isOfDomainObject(user)).toBe(true);
  });

  it('should return true for DomainLiteral instances', () => {
    interface Address {
      street: string;
      city: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}

    const address = new Address({ street: '123 Main St', city: 'Portland' });
    expect(isOfDomainObject(address)).toBe(true);
  });

  it('should return true for DomainEvent instances', () => {
    interface UserCreatedEvent {
      userUuid: string;
      occurredAt: Date;
    }
    class UserCreatedEvent
      extends DomainEvent<UserCreatedEvent>
      implements UserCreatedEvent
    {
      public static unique = ['userUuid', 'occurredAt'] as const;
    }

    const event = new UserCreatedEvent({
      userUuid: '123',
      occurredAt: new Date(),
    });
    expect(isOfDomainObject(event)).toBe(true);
  });

  it('should return false for plain objects', () => {
    const plainObject = { make: 'Toyota', model: 'Camry' };
    expect(isOfDomainObject(plainObject)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isOfDomainObject('string')).toBe(false);
    expect(isOfDomainObject(123)).toBe(false);
    expect(isOfDomainObject(true)).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isOfDomainObject(null)).toBe(false);
    expect(isOfDomainObject(undefined)).toBe(false);
  });

  it('should support cross-version compatibility via symbol marker', () => {
    // Simulate a class from a different version that has the marker
    const mark = Symbol.for('domain-objects/DomainObject');
    class LegacyDomainObject {
      public static readonly [mark] = '0.20.0'; // Old version
      constructor(public value: string) {}
    }

    const legacy = new LegacyDomainObject('test');
    expect(isOfDomainObject(legacy)).toBe(true);
  });
});
