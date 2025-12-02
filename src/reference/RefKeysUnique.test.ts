import { DomainEntity } from '../instantiation/DomainEntity';
import type { RefKeysUnique } from './RefKeysUnique';

describe('RefKeysUnique', () => {
  it('should accurately extract the unique keys of an entity', () => {
    interface SeaTurtle {
      seawaterSecurityNumber: string;
      name: string;
    }
    class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
      public static unique = ['seawaterSecurityNumber'] as const;
    }

    // should be correct
    const uniqueKeysRight: RefKeysUnique<typeof SeaTurtle> = [
      'seawaterSecurityNumber',
    ];

    // should be invalid
    const uniqueKeysWrong: RefKeysUnique<typeof SeaTurtle> = [
      // @ts-expect-error - saltwater != seawater
      'saltwaterSecurityNumber',
    ];
  });
});
