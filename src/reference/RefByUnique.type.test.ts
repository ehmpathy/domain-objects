import { DomainEntity } from '../instantiation/DomainEntity';
import { RefByUnique } from './RefByUnique.type';
import { RefKeysUnique } from './RefKeysUnique';

describe('DomainUniqueShape', () => {
  it('should accurately extract the unique key shape of an entity', () => {
    interface SeaTurtle {
      seawaterSecurityNumber: string;
      name: string;
    }
    class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
      public static unique = ['seawaterSecurityNumber'] as const;
    }

    // should be correct
    const uniqueKeysRight: RefByUnique<typeof SeaTurtle> = {
      seawaterSecurityNumber: '821',
    };

    // should be invalid
    const uniqueKeysWrongName: RefByUnique<typeof SeaTurtle> = {
      // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
      seawaterSecurityNumber: 921,
    };

    // should be invalid
    const uniqueKeysWrongKey: RefByUnique<typeof SeaTurtle> = {
      // @ts-expect-error - 'saltwaterSecurityNumber' does not exist in type 'RefByUnique<typeof SeaTurtle>'. Did you mean to write 'seawaterSecurityNumber'? ts(2322)
      saltwaterSecurityNumber: '821',
    };
  });
});
