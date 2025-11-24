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

    describe('nested', () => {
      it('should work with nested RefByUnique in static nested declaration', () => {
        const shell = new SeaTurtleShell({
          turtle: { seawaterSecurityNumber: '821' },
          algea: 'ALIL',
        });

        expect(shell.turtle).toBeInstanceOf(DomainLiteral);
        expect(shell.turtle).toHaveProperty('seawaterSecurityNumber', '821');
        expect(shell.turtle).not.toHaveProperty('name');
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
