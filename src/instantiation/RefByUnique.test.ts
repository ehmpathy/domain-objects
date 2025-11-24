import { DomainEntity } from './DomainEntity';
import { DomainLiteral } from './DomainLiteral';
import { RefByUnique } from './RefByUnique';

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
  turtle: RefByUnique<typeof SeaTurtle>;
  algea: 'ALOT' | 'ALIL';
}
class SeaTurtleShell
  extends DomainEntity<SeaTurtleShell>
  implements SeaTurtleShell
{
  public static unique = ['turtle'] as const;
  public static nested = {
    turtle: RefByUnique<typeof SeaTurtle>,
  };
}

interface SeaTurtleFamily {
  members: RefByUnique<typeof SeaTurtle>[];
}
class SeaTurtleFamily
  extends DomainEntity<SeaTurtleFamily>
  implements SeaTurtleFamily
{
  public static nested = {
    members: RefByUnique<typeof SeaTurtle>,
  };
}

describe('DomainRefByUnique', () => {
  describe('behavior.devtime', () => {
    it('should be assignable to RefByUnique type', () => {
      // Create a DomainRefByUnique instance with the ref shape
      const ref = new RefByUnique<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });

      // This should be assignable - proving DomainRefByUnique<RefByUnique<T>> === RefByUnique<T>
      const refAsPlainObject: RefByUnique<typeof SeaTurtle> = ref;

      expect(refAsPlainObject.seawaterSecurityNumber).toBe('821');
    });
    it('should accurately extract the unique key shape of an entity', () => {
      // should be correct
      const uniqueKeysRight: RefByUnique<typeof SeaTurtle> = {
        seawaterSecurityNumber: '821',
      };
      expect(uniqueKeysRight).toBeDefined();

      // should be invalid
      const uniqueKeysWrongValue: RefByUnique<typeof SeaTurtle> = {
        // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
        seawaterSecurityNumber: 921,
      };
      expect(uniqueKeysWrongValue).toBeDefined();

      // should be invalid
      const uniqueKeysWrongKey: RefByUnique<typeof SeaTurtle> = {
        // @ts-expect-error - 'saltwaterSecurityNumber' does not exist in type 'RefByUnique<typeof SeaTurtle>'. Did you mean to write 'seawaterSecurityNumber'? ts(2322)
        saltwaterSecurityNumber: '821',
      };
      expect(uniqueKeysWrongKey).toBeDefined();
    });
    it('should support .build withImmute', () => {
      // should work with correct inputs
      const ref: RefByUnique<typeof SeaTurtle> = RefByUnique.build<
        typeof SeaTurtle
      >({
        seawaterSecurityNumber: '821',
      });
      expect(ref.seawaterSecurityNumber).toBe('821');

      // should have typedef failure with wrong inputs
      RefByUnique.build<typeof SeaTurtle>({
        // @ts-expect-error: 'saltwaterSecurityNumber' does not exist in type 'RefByUnique<typeof SeaTurtle, any, any, any>'
        saltwaterSecurityNumber: '821',
      });

      // should have typedef failure with wrong inputs
      RefByUnique.build<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        seawaterSecurityNumber: 821,
      });
    });
    it('should support .as withImmute', () => {
      // should work with correct inputs
      const ref: RefByUnique<typeof SeaTurtle> = RefByUnique.as<
        typeof SeaTurtle
      >({
        seawaterSecurityNumber: '821',
      });
      expect(ref.seawaterSecurityNumber).toBe('821');

      // should have typedef failure with wrong inputs
      RefByUnique.as<typeof SeaTurtle>({
        // @ts-expect-error: 'saltwaterSecurityNumber' does not exist in type 'RefByUnique<typeof SeaTurtle, any, any, any>'
        saltwaterSecurityNumber: '821',
      });

      // should have typedef failure with wrong inputs
      RefByUnique.as<typeof SeaTurtle>({
        // @ts-expect-error: Type 'number' is not assignable to type 'string'.ts(2322)
        seawaterSecurityNumber: 821,
      });
    });
  });

  describe('behavior.runtime', () => {
    it('should have a clear constructor name', () => {
      const ref = new RefByUnique<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref.constructor.name).toEqual('RefByUnique');

      // but the literal should still bet untouched
      const literal = new DomainLiteral({ any: 'value' });
      expect(literal.constructor.name).toEqual('DomainLiteral');
    });

    it('should be an instance of itself', () => {
      const ref = new RefByUnique<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref).toBeInstanceOf(RefByUnique);
    });
    it('should be an instance of domain literal', () => {
      const ref = new RefByUnique<typeof SeaTurtle>({
        seawaterSecurityNumber: '821',
      });
      expect(ref).toBeInstanceOf(DomainLiteral);
    });

    it('should narrow down to only the unique key ref when full instance is passed to RefByUnique constructor', () => {
      // create full turtle instance
      const turtle = new SeaTurtle({
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        seawaterSecurityNumber: '821',
        name: 'Crush',
      });

      // pass the full instance to RefByUnique constructor
      const ref = new RefByUnique<typeof SeaTurtle>(turtle); // turtle fits into ref by unique, since its a superset

      // the ref should be stripped of everything beyond refByUnique though, on outcome
      expect(ref).toBeInstanceOf(RefByUnique);
      expect(ref).toHaveProperty('seawaterSecurityNumber', '821');
      expect(ref).not.toHaveProperty('uuid');
      expect(ref).not.toHaveProperty('name');
    });

    describe('nested', () => {
      it('should work with nested RefByUnique in static nested declaration', () => {
        const shell = new SeaTurtleShell({
          turtle: { seawaterSecurityNumber: '821' },
          algea: 'ALIL',
        });

        expect(shell.turtle).toBeInstanceOf(RefByUnique);
        expect(shell.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(shell.turtle).not.toHaveProperty('name');
      });
      it('should narrow down to only the unique key attributes with nested RefByUnique in static nested declaration', () => {
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
        expect(shell.turtle).toBeInstanceOf(RefByUnique);
        expect(shell.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(shell.turtle).not.toHaveProperty('name');
        expect(shell.turtle).not.toHaveProperty('uuid');
      });
      it('should narrow down to only the unique key attributes with nested RefByUnique in static nested declaration, even through RefByUnique directly', () => {
        // create full turtle instance
        const turtle = new SeaTurtle({
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        });

        // create a ref, which uses the full turtle instance in declaration
        const ref = new RefByUnique<typeof SeaTurtleShell>({
          turtle,
        });

        // prove it does not have any non unique key attributes anymore => it was narrowed
        expect(ref.turtle).toBeInstanceOf(RefByUnique);
        expect(ref.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(ref.turtle).not.toHaveProperty('name');
        expect(ref.turtle).not.toHaveProperty('uuid');
      });
      it('should work with array of nested RefByUnique', () => {
        const family = new SeaTurtleFamily({
          members: [
            { seawaterSecurityNumber: '821' },
            { seawaterSecurityNumber: '823' },
          ],
        });

        expect(family.members).toHaveLength(2);
        expect(family.members[0]).toHaveProperty(
          'seawaterSecurityNumber',
          '821',
        );
        expect(family.members[1]).toHaveProperty(
          'seawaterSecurityNumber',
          '823',
        );
      });
    });
  });
});
