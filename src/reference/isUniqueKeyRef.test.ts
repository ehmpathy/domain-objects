import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';
import { isUniqueKeyRef } from './isUniqueKeyRef';

describe('isUniqueKeyRef', () => {
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
    it('should correctly identify that an object with the same shape as the unique key is a unique key ref', () => {
      const ref = { seawaterSecurityNumber: '821' };
      const decision = isUniqueKeyRef({ of: SeaTurtle })(ref);
      expect(decision).toEqual(true);
    });
    it('should correctly identify that an object with the missing keys from the primary key is not a primary key ref', () => {
      const ref = { uuid: 'uuid' };
      const decision = isUniqueKeyRef({ of: SeaTurtle })(ref);
      expect(decision).toEqual(false);
    });
  });
  describe('guard', () => {
    it('should narrow types ', () => {
      const ref:
        | DomainUniqueKeyShape<typeof SeaTurtle>
        | DomainPrimaryKeyShape<typeof SeaTurtle> = {
        seawaterSecurityNumber: '821',
      } as any;

      // if within the type guard, true
      if (isUniqueKeyRef({ of: SeaTurtle })(ref)) {
        // should be able to access the ssn
        const seawaterSecurityNumber: string = ref.seawaterSecurityNumber;

        // should be able to assign to the unique key shape
        const uk: DomainUniqueKeyShape<typeof SeaTurtle> = ref;
      }

      // if within the type guard, false
      if (!isUniqueKeyRef({ of: SeaTurtle })(ref)) {
        // @ts-expect-error: Property 'seawaterSecurityNumber' does not exist on type 'DomainPrimaryKeyShape<typeof SeaTurtle>'.ts(2339)
        const seawaterSecurityNumber: string = ref.seawaterSecurityNumber;

        // @ts-expect-error: Property 'seawaterSecurityNumber' is missing in type 'DomainUniqueKeyShape<typeof SeaTurtle>' but required in type 'Required<Pick<SeaTurtle, "uuid">>'.ts(2741)
        const uk: DomainUniqueKeyShape<typeof SeaTurtle> = ref;

        // should be able to assign to the primary key shape, since we know that it is one or the other as input
        const pk: DomainPrimaryKeyShape<typeof SeaTurtle> = ref;
      }
    });
  });
});
