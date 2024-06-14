import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';

describe('DomainPrimaryKeyShape', () => {
  it('should accurately extract the primary key shape of an entity', () => {
    interface SeaTurtle {
      uuid?: string;
      seawaterSecurityNumber: string;
      name: string;
    }
    class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
      public static primary = ['uuid'] as const;
      public static unique = ['seawaterSecurityNumber'] as const;
    }

    // should be correct
    const uniqueKeysRight: DomainPrimaryKeyShape<typeof SeaTurtle> = {
      uuid: '821',
    };

    // should be invalid
    const uniqueKeysWrongName: DomainPrimaryKeyShape<typeof SeaTurtle> = {
      // @ts-expect-error - Type 'number' is not assignable to type 'string'.ts(2322)
      uuid: 921,
    };

    // should be invalid
    const uniqueKeysWrongKey: DomainPrimaryKeyShape<typeof SeaTurtle> = {
      // @ts-expect-error - 'guid' does not exist in type 'DomainUniqueKeyShape<typeof SeaTurtle>'. Did you mean to write 'uuid'? ts(2322)
      guid: '821',
    };

    // should be invalid
    // @ts-expect-error - Property 'uuid' is missing in type '{}' but required in type 'Required<Pick<SeaTurtle, "uuid">>'.ts(2741)
    const uniqueKeysOptionalStill: DomainPrimaryKeyShape<typeof SeaTurtle> = {};
  });
});
