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

  it('should return true for DomainObject classes', () => {
    interface Car {
      make: string;
      model: string;
    }
    class Car extends DomainObject<Car> implements Car {}

    expect(isOfDomainObject(Car)).toBe(true);
    expect(isOfDomainObject(DomainObject)).toBe(true);
    expect(isOfDomainObject(DomainEntity)).toBe(true);
    expect(isOfDomainObject(DomainLiteral)).toBe(true);
    expect(isOfDomainObject(DomainEvent)).toBe(true);
  });

  it('should return false for plain classes', () => {
    class PlainClass {
      constructor(public value: string) {}
    }

    expect(isOfDomainObject(PlainClass)).toBe(false);
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

  it('should detect deeply nested DomainEntity subclasses', () => {
    interface DeepEntity {
      uuid: string;
    }
    class DeepEntity extends DomainEntity<DeepEntity> implements DeepEntity {
      public static unique = ['uuid'] as const;
    }
    class DeeperEntity extends DeepEntity {}
    class DeepestEntity extends DeeperEntity {}

    expect(isOfDomainObject(new DeepEntity({ uuid: '1' }))).toBe(true);
    expect(isOfDomainObject(new DeeperEntity({ uuid: '2' }))).toBe(true);
    expect(isOfDomainObject(new DeepestEntity({ uuid: '3' }))).toBe(true);
  });

  it('should work via static property inheritance (no prototype walk needed)', () => {
    // prove that JS static property lookup follows the prototype chain automatically
    // so we dont need to manually walk it
    interface GrandParent {
      name: string;
    }
    class GrandParent
      extends DomainObject<GrandParent>
      implements GrandParent {}
    class Parent extends GrandParent {}
    class Child extends Parent {}
    class GrandChild extends Child {}

    expect(isOfDomainObject(new GrandParent({ name: 'a' }))).toBe(true);
    expect(isOfDomainObject(new Parent({ name: 'b' }))).toBe(true);
    expect(isOfDomainObject(new Child({ name: 'c' }))).toBe(true);
    expect(isOfDomainObject(new GrandChild({ name: 'd' }))).toBe(true);
  });
});
