import { DomainEntity } from '../DomainEntity';
import { DomainEvent } from '../DomainEvent';
import { isOfDomainEvent } from './isOfDomainEvent';

describe('isOfDomainEvent', () => {
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
    expect(isOfDomainEvent(event)).toBe(true);
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
    expect(isOfDomainEvent(user)).toBe(false);
  });

  it('should return false for plain objects', () => {
    const plainObject = { userUuid: '123', occurredAt: new Date() };
    expect(isOfDomainEvent(plainObject)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isOfDomainEvent('string')).toBe(false);
    expect(isOfDomainEvent(123)).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isOfDomainEvent(null)).toBe(false);
    expect(isOfDomainEvent(undefined)).toBe(false);
  });

  it('should support cross-version compatibility via symbol marker', () => {
    // Simulate a class from a different version that has the marker
    const mark = Symbol.for('domain-objects/DomainEvent');
    class LegacyDomainEvent {
      public static readonly [mark] = '0.20.0'; // Old version
      constructor(
        public userUuid: string,
        public occurredAt: Date,
      ) {}
    }

    const legacy = new LegacyDomainEvent('123', new Date());
    expect(isOfDomainEvent(legacy)).toBe(true);
  });
});
