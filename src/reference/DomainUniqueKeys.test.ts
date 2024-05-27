import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainUniqueKeys } from './DomainUniqueKeys';

describe('DomainUniqueKeys', () => {
  it('should accurately extract the unique keys of an entity', () => {
    interface SeaTurtle {
      seawaterSecurityNumber: string;
      name: string;
    }
    class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
      public static unique = ['seawaterSecurityNumber'] as const;
    }

    // should be correct
    const uniqueKeysRight: DomainUniqueKeys<typeof SeaTurtle> = [
      'seawaterSecurityNumber',
    ];

    // should be invalid
    const uniqueKeysWrong: DomainUniqueKeys<typeof SeaTurtle> = [
      // @ts-expect-error - saltwater != seawater
      'saltwaterSecurityNumber',
    ];
  });
});
