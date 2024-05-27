import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';
import { DomainUniqueKeys } from './DomainUniqueKeys';

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
    const uniqueKeysRight: DomainUniqueKeyShape<typeof SeaTurtle> = {
      seawaterSecurityNumber: '821',
    };

    // should be invalid
    const uniqueKeysWrongName: DomainUniqueKeyShape<typeof SeaTurtle> = {
      // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
      seawaterSecurityNumber: 921,
    };

    // should be invalid
    const uniqueKeysWrongKey: DomainUniqueKeyShape<typeof SeaTurtle> = {
      // @ts-expect-error - 'saltwaterSecurityNumber' does not exist in type 'DomainUniqueKeyShape<typeof SeaTurtle>'. Did you mean to write 'seawaterSecurityNumber'? ts(2322)
      saltwaterSecurityNumber: '821',
    };
  });
});
