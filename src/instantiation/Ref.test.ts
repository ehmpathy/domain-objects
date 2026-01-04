import { omitReadonly } from '@src/manipulation/omitReadonly';
import { isRefByPrimary } from '@src/reference/isRefByPrimary';
import { isRefByUnique } from '@src/reference/isRefByUnique';

import { DomainEntity } from './DomainEntity';
import { DomainLiteral } from './DomainLiteral';
import { Ref } from './Ref';

interface SeaTurtle {
  uuid?: string;
  seawaterSecurityNumber: string;
  name: string;
}
class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
  public static primary = ['uuid'] as const;
  public static unique = ['seawaterSecurityNumber'] as const;
}

interface SeaTurtleShell {
  turtle: Ref<typeof SeaTurtle>;
  algea: 'ALOT' | 'ALIL';
}
class SeaTurtleShell
  extends DomainEntity<SeaTurtleShell>
  implements SeaTurtleShell
{
  public static unique = ['turtle'] as const;
  public static nested = {
    turtle: Ref<typeof SeaTurtle>,
  };
}

describe('Ref', () => {
  describe('behavior.devtime', () => {
    it('should be assignable to Ref type with primary keys', () => {
      // Create a Ref instance with primary key shape
      const ref = new Ref<typeof SeaTurtle>({
        uuid: '123',
      });

      // This should be assignable - proving Ref accepts primary keys
      const refAsPlainObject: Ref<typeof SeaTurtle> = ref;

      // Use isRefByPrimary to narrow the type
      if (!isRefByPrimary({ of: SeaTurtle })(refAsPlainObject))
        throw new Error('expected ref to be by primary');
      expect(refAsPlainObject.uuid).toBe('123');
    });

    it('should be assignable to Ref type with unique keys', () => {
      // Create a Ref instance with unique key shape
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      // This should be assignable - proving Ref accepts unique keys
      const refAsPlainObject: Ref<typeof SeaTurtle> = ref;

      // Use isRefByUnique to narrow the type
      if (!isRefByUnique({ of: SeaTurtle })(refAsPlainObject))
        throw new Error('expected ref to be by unique');
      expect(refAsPlainObject.seawaterSecurityNumber).toBe('821');
    });

    it('should accurately extract the primary or unique key shape of an entity', () => {
      // should be correct with primary keys
      const primaryKeysRight: Ref<typeof SeaTurtle> = {
        uuid: '123',
      };
      expect(primaryKeysRight).toBeDefined();

      // should be correct with unique keys
      const uniqueKeysRight: Ref<typeof SeaTurtle> = {
        seawaterSecurityNumber: '821',
      };
      expect(uniqueKeysRight).toBeDefined();

      // should be invalid with wrong value type
      const wrongValue: Ref<typeof SeaTurtle> = {
        // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
        uuid: 123,
      };
      expect(wrongValue).toBeDefined();
    });

    it('should support .build withImmute with primary keys', () => {
      // should work with correct inputs
      const ref: Ref<typeof SeaTurtle> = Ref.as<typeof SeaTurtle>({
        uuid: '__uuid__',
      });

      // Use isRefByPrimary to narrow the type
      if (!isRefByPrimary({ of: SeaTurtle })(ref))
        throw new Error('expected ref to be by primary');
      expect(ref.uuid).toBe('__uuid__');

      // should have typedef failure with wrong inputs
      Ref.as<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        uuid: 821,
      });
    });

    it('should support .build withImmute with unique keys', () => {
      // should work with correct inputs
      const ref: Ref<typeof SeaTurtle> = Ref.as<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      // Use isRefByUnique to narrow the type
      if (!isRefByUnique({ of: SeaTurtle })(ref))
        throw new Error('expected ref to be by unique');
      expect(ref.seawaterSecurityNumber).toBe('821');

      // should have typedef failure with wrong inputs
      Ref.as<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        seawaterSecurityNumber: 821,
      });
    });

    it('should support .as withImmute with primary keys', () => {
      // should work with correct inputs
      const ref: Ref<typeof SeaTurtle> = Ref.as<typeof SeaTurtle>({
        uuid: '__uuid__',
      });

      // Use isRefByPrimary to narrow the type
      if (!isRefByPrimary({ of: SeaTurtle })(ref))
        throw new Error('expected ref to be by primary');
      expect(ref.uuid).toBe('__uuid__');
    });

    it('should support .as withImmute with unique keys', () => {
      // should work with correct inputs
      const ref: Ref<typeof SeaTurtle> = Ref.as<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      // Use isRefByUnique to narrow the type
      if (!isRefByUnique({ of: SeaTurtle })(ref))
        throw new Error('expected ref to be by unique');
      expect(ref.seawaterSecurityNumber).toBe('821');
    });
  });

  describe('behavior.runtime', () => {
    it('should have a clear constructor name', () => {
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref.constructor.name).toEqual('Ref');

      // but the literal should still be untouched
      const literal = new DomainLiteral({ any: 'value' });
      expect(literal.constructor.name).toEqual('DomainLiteral');
    });

    it('should be an instance of itself', () => {
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref).toBeInstanceOf(Ref);
    });

    it('should be an instance of domain literal', () => {
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref).toBeInstanceOf(DomainLiteral);
    });

    it('should narrow down to only the unique key ref when full instance is passed to Ref constructor', () => {
      // create full turtle instance
      const turtle = new SeaTurtle({
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        seawaterSecurityNumber: '821',
        name: 'Crush',
      });

      // pass the full instance to Ref constructor
      const ref = new Ref<typeof SeaTurtle>(turtle);

      // the ref should be stripped of everything beyond refByUnique (since unique keys are always available)
      expect(ref).toBeInstanceOf(Ref);
      expect(ref).toHaveProperty('seawaterSecurityNumber', '821');
      expect(ref).not.toHaveProperty('uuid');
      expect(ref).not.toHaveProperty('name');
    });

    it('should preserve primary key ref when passed explicitly', () => {
      // pass primary key ref directly
      const ref = new Ref<typeof SeaTurtle>({
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      });

      // the ref should contain the primary key
      expect(ref).toBeInstanceOf(Ref);
      expect(ref).toHaveProperty(
        'uuid',
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(ref).not.toHaveProperty('seawaterSecurityNumber');
      expect(ref).not.toHaveProperty('name');
    });

    it('should preserve unique key ref when passed explicitly', () => {
      // pass unique key ref directly
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      // the ref should contain the unique key
      expect(ref).toBeInstanceOf(Ref);
      expect(ref).toHaveProperty('seawaterSecurityNumber', '821');
      expect(ref).not.toHaveProperty('uuid');
      expect(ref).not.toHaveProperty('name');
    });

    describe('nested', () => {
      it('should work with nested Ref in static nested declaration', () => {
        const shell = new SeaTurtleShell({
          turtle: { seawaterSecurityNumber: '821' },
          algea: 'ALIL',
        });

        expect(shell.turtle).toBeInstanceOf(Ref);
        expect(shell.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(shell.turtle).not.toHaveProperty('name');
      });

      it('should narrow down to only the unique key attributes with nested Ref in static nested declaration', () => {
        // create full turtle instance
        const turtle = new SeaTurtle({
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        });

        // create a shell, which uses the full turtle instance in declaration
        const shell = new SeaTurtleShell({
          turtle,
          algea: 'ALIL',
        });

        // prove it does not have any non unique key attributes anymore => it was narrowed
        expect(shell.turtle).toBeInstanceOf(Ref);
        expect(shell.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(shell.turtle).not.toHaveProperty('name');
        expect(shell.turtle).not.toHaveProperty('uuid');
      });

      it('should narrow down to only the unique key attributes with nested Ref in static nested declaration, even through Ref directly', () => {
        // create full turtle instance
        const turtle = new SeaTurtle({
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        });

        // create a ref, which uses the full turtle instance in declaration
        const ref = new Ref<typeof SeaTurtleShell>({
          turtle,
        });

        // prove it does not have any non unique key attributes anymore => it was narrowed
        expect(ref.turtle).toBeInstanceOf(Ref);
        expect(ref.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(ref.turtle).not.toHaveProperty('name');
        expect(ref.turtle).not.toHaveProperty('uuid');
      });
    });

    it('should not omit anything when omitReadonly is called, since refs have no metadata', () => {
      const ref = new Ref<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      const refWithoutReadonly = omitReadonly(ref);

      // all properties should be preserved since Ref has metadata = []
      if (!isRefByUnique({ of: SeaTurtle })(refWithoutReadonly))
        throw new Error('expected ref to be by unique');
      expect(refWithoutReadonly.seawaterSecurityNumber).toBe('821');
      expect(refWithoutReadonly).toBeInstanceOf(Ref);
    });
  });
});
