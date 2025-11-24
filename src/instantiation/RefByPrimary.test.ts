import { DomainEntity } from './DomainEntity';
import { DomainLiteral } from './DomainLiteral';
import { RefByPrimary } from './RefByPrimary';

interface SeaTurtle {
  uuid: string;
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

    it('should narrow down to only the primary key ref when full instance is passed to RefByPrimary constructor', () => {
      // create full turtle instance
      const turtle = new SeaTurtle({
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        seawaterSecurityNumber: '821',
        name: 'Crush',
      });

      // pass the full instance to RefByPrimary constructor
      const ref = new RefByPrimary<typeof SeaTurtle>(turtle); // turtle fits into ref by primary, since its a superset

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
        const turtle = new SeaTurtle({
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        });

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
