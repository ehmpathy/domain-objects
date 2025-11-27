import { HasMetadata, OmitMetadata } from 'type-fns';

import { DomainEntity } from './DomainEntity';
import { DomainLiteral } from './DomainLiteral';
import { RefByPrimary } from './RefByPrimary';

interface SeaTurtle {
  uuid?: string; // uuid is typically metadata known only after persistence, so its optional
  seawaterSecurityNumber: string;
  name: string;
}
class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
  public static primary = ['uuid'] as const;
  public static unique = ['seawaterSecurityNumber'] as const;
}

interface SeaTurtleHome {
  turtle: RefByPrimary<typeof SeaTurtle>;
  variant: 'REEF' | 'BAY';
}
class SeaTurtleHome
  extends DomainEntity<SeaTurtleHome>
  implements SeaTurtleHome
{
  public static unique = ['turtle'] as const;
  public static nested = {
    turtle: RefByPrimary<typeof SeaTurtle>,
  };
}

describe('DomainRefByPrimary', () => {
  describe('behavior.devtime', () => {
    it('should be assignable to RefByPrimary type', () => {
      // Create a DomainRefByPrimary instance with the ref shape
      const ref = new RefByPrimary<typeof SeaTurtle>({
        uuid: '123',
      });

      // This should be assignable - proving DomainRefByPrimary<RefByPrimary<T>> === RefByPrimary<T>
      const refAsPlainObject: RefByPrimary<typeof SeaTurtle> = ref;

      expect(refAsPlainObject.uuid).toBe('123');
    });

    it('should extract optional primary key as required in RefByPrimary type', () => {
      // given an entity where uuid is optional
      // when we create a RefByPrimary type from it
      // then the uuid should be REQUIRED in the ref (not optional)

      // this should compile - uuid is required in the ref type
      const validRef: RefByPrimary<typeof SeaTurtle> = {
        uuid: '123',
      };
      expect(validRef.uuid).toBe('123');

      // this should NOT compile - missing required uuid
      // @ts-expect-error - Property 'uuid' is missing in type '{}' but required in type 'RefByPrimary<typeof SeaTurtle>'
      const invalidRefMissingUuid: RefByPrimary<typeof SeaTurtle> = {};
      expect(invalidRefMissingUuid).toBeDefined();

      // this should NOT compile - uuid cannot be undefined
      const invalidRefUndefinedUuid: RefByPrimary<typeof SeaTurtle> = {
        // @ts-expect-error - Type 'undefined' is not assignable to type 'string'
        uuid: undefined,
      };
      expect(invalidRefUndefinedUuid).toBeDefined();
    });

    it('should accept HasMetadata<Entity> but not plain Entity with optional primary key', () => {
      // given an entity where primary key is optional
      // HasMetadata<SeaTurtle> should fit into RefByPrimary since it makes uuid required
      const turtleWithMetadata: HasMetadata<SeaTurtle> = {
        uuid: '123',
        seawaterSecurityNumber: '821',
        name: 'Crush',
      };
      const refFromHasMetadata: RefByPrimary<typeof SeaTurtle> =
        turtleWithMetadata;
      expect(refFromHasMetadata.uuid).toBe('123');

      // plain SeaTurtle should NOT fit since uuid is optional
      const turtleWithoutMetadata: SeaTurtle = {
        seawaterSecurityNumber: '821',
        name: 'Crush',
      };
      // @ts-expect-error - Type 'SeaTurtle' is not assignable to type 'RefByPrimary<typeof SeaTurtle>'. Types of property 'uuid' are incompatible.
      const refFromPlain: RefByPrimary<typeof SeaTurtle> =
        turtleWithoutMetadata;
      expect(refFromPlain).toBeDefined();
    });

    it('should accurately extract the primary key shape of an entity', () => {
      // should be correct
      const primaryKeysRight: RefByPrimary<typeof SeaTurtle> = {
        uuid: '123',
      };
      expect(primaryKeysRight).toBeDefined();

      // should be invalid
      const primaryKeysWrongValue: RefByPrimary<typeof SeaTurtle> = {
        // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
        uuid: 123,
      };
      expect(primaryKeysWrongValue).toBeDefined();

      // should be invalid
      const primaryKeysWrongKey: RefByPrimary<typeof SeaTurtle> = {
        // @ts-expect-error - 'uid' does not exist in type 'RefByPrimary<typeof SeaTurtle>'. Did you mean to write 'uuid'? ts(2322)
        uid: '123',
      };
      expect(primaryKeysWrongKey).toBeDefined();
    });

    it('should support .build withImmute', () => {
      // should work with correct inputs
      const ref: RefByPrimary<typeof SeaTurtle> = RefByPrimary.build<
        typeof SeaTurtle
      >({
        uuid: '__uuid__',
      });
      expect(ref.uuid).toBe('__uuid__');

      // should have typedef failure with wrong inputs
      RefByPrimary.build<typeof SeaTurtle>({
        // @ts-expect-error: 'id' does not exist in type 'RefByPrimary<typeof SeaTurtle, any, any, any>'
        id: '821',
      });

      // should have typedef failure with wrong inputs
      RefByPrimary.build<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        uuid: 821,
      });

      // should have typedef failure when uuid is missing
      RefByPrimary.build<typeof SeaTurtle>(
        // @ts-expect-error: Property 'uuid' is missing
        {},
      );
    });

    it('should support .as withImmute', () => {
      // should work with correct inputs
      const ref: RefByPrimary<typeof SeaTurtle> = RefByPrimary.as<
        typeof SeaTurtle
      >({
        uuid: '__uuid__',
      });
      expect(ref.uuid).toBe('__uuid__');

      // should have typedef failure with wrong inputs
      RefByPrimary.as<typeof SeaTurtle>({
        // @ts-expect-error: 'saltwaterSecurityNumber' does not exist in type 'RefByPrimary<typeof SeaTurtle, any, any, any>'
        id: '821',
      });

      // should have typedef failure with wrong inputs
      RefByPrimary.as<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        uuid: 821,
      });

      // should have typedef failure when uuid is missing
      RefByPrimary.as<typeof SeaTurtle>(
        // @ts-expect-error: Property 'uuid' is missing
        {},
      );
    });
  });

  describe('behavior.runtime', () => {
    it('should have a clear constructor name', () => {
      const ref = new RefByPrimary<typeof SeaTurtle>({
        uuid: '123',
      });
      expect(ref.constructor.name).toEqual('RefByPrimary');

      // but the literal should still bet untouched
      const literal = new DomainLiteral({ any: 'value' });
      expect(literal.constructor.name).toEqual('DomainLiteral');
    });

    it('should be an instance of itself', () => {
      const ref = new RefByPrimary<typeof SeaTurtle>({
        uuid: '123',
      });
      expect(ref).toBeInstanceOf(RefByPrimary);
    });
    it('should be an instance of domain literal', () => {
      const ref = new RefByPrimary<typeof SeaTurtle>({
        uuid: '123',
      });
      expect(ref).toBeInstanceOf(DomainLiteral);
    });

    it('should throw an error if any primary key is undefined at runtime', () => {
      // given an entity where uuid is optional (since its metadata generated only at persistance time)
      // when we try to create a RefByPrimary with undefined uuid
      // then it should throw an error at runtime

      expect(() => {
        new RefByPrimary<typeof SeaTurtle>({
          uuid: undefined as any, // bypass type check to test runtime behavior
        });
      }).toThrow(/primary key .* is undefined/i);
    });
    it('should throw an error if any primary key is undefined at runtime when full instance is passed to the RefByPrimary constructor, too', () => {
      // create full turtle instance, but without metadata
      const turtle: OmitMetadata<SeaTurtle> = new SeaTurtle({
        seawaterSecurityNumber: '821',
        name: 'Crush',
      });

      expect(() => {
        new RefByPrimary<typeof SeaTurtle>(turtle as HasMetadata<SeaTurtle>);
      }).toThrow(/primary key .* is undefined/i);
    });

    it('should narrow down to only the primary key ref when full instance is passed to RefByPrimary constructor', () => {
      // create full turtle instance w/ metadata
      const turtle: HasMetadata<SeaTurtle> = new SeaTurtle({
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        seawaterSecurityNumber: '821',
        name: 'Crush',
      }) as HasMetadata<SeaTurtle>;

      // pass the full instance to RefByPrimary constructor
      const ref = new RefByPrimary<typeof SeaTurtle>(turtle); // turtle fits into ref by primary when hasMetadata

      // the ref should be stripped of everything beyond refByPrimary though, on outcome
      expect(ref).toBeInstanceOf(RefByPrimary);
      expect(ref).toHaveProperty(
        'uuid',
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(ref).not.toHaveProperty('seawaterSecurityNumber');
      expect(ref).not.toHaveProperty('name');
    });

    describe('nested', () => {
      it('should work with nested RefByPrimary in static nested declaration', () => {
        const shell = new SeaTurtleHome({
          turtle: { uuid: '123' },
          variant: 'REEF',
        });

        expect(shell.turtle).toBeInstanceOf(RefByPrimary);
        expect(shell.turtle).toHaveProperty('uuid', '123');
        expect(shell.turtle).not.toHaveProperty('seawaterSecurityNumber');
        expect(shell.turtle).not.toHaveProperty('name');
      });
      it('should narrow down to only the primary key attributes with nested RefByPrimary in static nested declaration', () => {
        // create full turtle instance
        const turtle: HasMetadata<SeaTurtle> = new SeaTurtle({
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        }) as HasMetadata<SeaTurtle>;

        // create a home, which uses the full turtle instance in declaration
        const home = new SeaTurtleHome({
          turtle,
          variant: 'REEF',
        });

        // prove it does not have any non primary key attributes anymore => it was narrowed
        expect(home.turtle).toBeInstanceOf(RefByPrimary);
        expect(home.turtle).toHaveProperty(
          'uuid',
          '123e4567-e89b-12d3-a456-426614174000',
        );
        expect(home.turtle).not.toHaveProperty('name');
        expect(home.turtle).not.toHaveProperty('seawaterSecurityNumber');
      });
    });
  });
});
