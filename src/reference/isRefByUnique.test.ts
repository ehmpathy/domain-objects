import { DomainEntity } from '../instantiation/DomainEntity';
import { RefByPrimary } from '../instantiation/RefByPrimary';
import { RefByUnique } from '../instantiation/RefByUnique';
import { isRefByUnique } from './isRefByUnique';

describe('isRefByUnique', () => {
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
      const decision = isRefByUnique({ of: SeaTurtle })(ref);
      expect(decision).toEqual(true);
    });
    it('should correctly identify that an object with the missing keys from the primary key is not a primary key ref', () => {
      const ref = { uuid: 'uuid' };
      const decision = isRefByUnique({ of: SeaTurtle })(ref);
      expect(decision).toEqual(false);
    });
  });
  describe('guard', () => {
    it('should narrow types ', () => {
      const ref:
        | RefByUnique<typeof SeaTurtle>
        | RefByPrimary<typeof SeaTurtle> = {
        seawaterSecurityNumber: '821',
      } as any;

      // if within the type guard, true
      if (isRefByUnique({ of: SeaTurtle })(ref)) {
        // should be able to access the ssn
        const seawaterSecurityNumber: string = ref.seawaterSecurityNumber;
        expect(seawaterSecurityNumber).toBeDefined();

        // should be able to assign to the unique key shape
        const uk: RefByUnique<typeof SeaTurtle> = ref;
        expect(uk).toBeDefined();
      }

      // if within the type guard, false
      if (!isRefByUnique({ of: SeaTurtle })(ref)) {
        // @ts-expect-error: Property 'seawaterSecurityNumber' does not exist on type 'RefByPrimary<typeof SeaTurtle>'.ts(2339)
        const seawaterSecurityNumber: string = ref.seawaterSecurityNumber;
        expect(seawaterSecurityNumber).toBeDefined();

        // @ts-expect-error: Property 'seawaterSecurityNumber' is missing in type 'RefByUnique<typeof SeaTurtle>' but required in type 'Required<Pick<SeaTurtle, "uuid">>'.ts(2741)
        const uk: RefByUnique<typeof SeaTurtle> = ref;
        expect(uk).toBeDefined();

        // should be able to assign to the primary key shape, since we know that it is one or the other as input
        const pk: RefByPrimary<typeof SeaTurtle> = ref;
        expect(pk).toBeDefined();
      }
    });
  });
});
