import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';
import { isPrimaryKeyRef } from './isPrimaryKeyRef';

describe('isPrimaryKeyRef', () => {
  interface SeaTurtle {
    uuid?: string;
    seawaterSecurityNumber: string;
    name: string;
  }
  class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
    public static primary = ['uuid'] as const;
    public static unique = ['seawaterSecurityNumber'] as const;
  }

  describe('assess', () => {
    it('should correctly identify that an object with the same shape as the primary key is a primary key ref', () => {
      const ref = { uuid: 'uuid' };
      const decision = isPrimaryKeyRef({ of: SeaTurtle })(ref);
      expect(decision).toEqual(true);
    });
    it('should correctly identify that an object with the missing keys from the primary key is not a primary key ref', () => {
      const ref = { seawaterSecurityNumber: '821' };
      const decision = isPrimaryKeyRef({ of: SeaTurtle })(ref);
      expect(decision).toEqual(false);
    });
  });
  describe('guard', () => {
    it('should narrow types ', () => {
      const ref:
        | DomainUniqueKeyShape<typeof SeaTurtle>
        | DomainPrimaryKeyShape<typeof SeaTurtle> = { uuid: 'uuid' } as any;

      // if within the type guard, true
      if (isPrimaryKeyRef({ of: SeaTurtle })(ref)) {
        // should be able to access the uuid
        const uuid: string = ref.uuid;

        // should be able to assign to the primary key shape
        const pk: DomainPrimaryKeyShape<typeof SeaTurtle> = ref;
      }

      // if within the type guard, false
      if (!isPrimaryKeyRef({ of: SeaTurtle })(ref)) {
        // @ts-expect-error: Property 'uuid' does not exist on type 'DomainUniqueKeyShape<typeof SeaTurtle>'.ts(2339)
        const uuid: string = ref.uuid;

        // @ts-expect-error: Property 'uuid' is missing in type 'DomainUniqueKeyShape<typeof SeaTurtle>' but required in type 'Required<Pick<SeaTurtle, "uuid">>'.ts(2741)
        const pk: DomainPrimaryKeyShape<typeof SeaTurtle> = ref;

        // should be able to assign to the unique key shape, since we know that it is one or the other as input
        const uk: DomainUniqueKeyShape<typeof SeaTurtle> = ref;
      }
    });
  });
});
