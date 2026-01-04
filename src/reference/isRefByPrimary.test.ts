import { DomainEntity } from '@src/instantiation/DomainEntity';
import type { RefByPrimary } from '@src/instantiation/RefByPrimary';
import type { RefByUnique } from '@src/instantiation/RefByUnique';

import { isRefByPrimary } from './isRefByPrimary';

describe('isRefByPrimary', () => {
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
      const decision = isRefByPrimary({ of: SeaTurtle })(ref);
      expect(decision).toEqual(true);
    });
    it('should correctly identify that an object with the missing keys from the primary key is not a primary key ref', () => {
      const ref = { seawaterSecurityNumber: '821' };
      const decision = isRefByPrimary({ of: SeaTurtle })(ref);
      expect(decision).toEqual(false);
    });
  });
  describe('guard', () => {
    it('should narrow types ', () => {
      const ref:
        | RefByUnique<typeof SeaTurtle>
        | RefByPrimary<typeof SeaTurtle> = { uuid: 'uuid' } as any;

      // if within the type guard, true
      if (isRefByPrimary({ of: SeaTurtle })(ref)) {
        // should be able to access the uuid
        const uuid: string | undefined = ref.uuid;

        // should be able to assign to the primary key shape
        const pk: RefByPrimary<typeof SeaTurtle> = ref;
      }

      // if within the type guard, false
      if (!isRefByPrimary({ of: SeaTurtle })(ref)) {
        // @ts-expect-error: Property 'uuid' does not exist on type 'RefByUnique<typeof SeaTurtle>'.ts(2339)
        const uuid: string = ref.uuid;

        // @ts-expect-error: Property 'uuid' is missing in type 'RefByUnique<typeof SeaTurtle>' but required in type 'Required<Pick<SeaTurtle, "uuid">>'.ts(2741)
        const pk: RefByPrimary<typeof SeaTurtle> = ref;

        // should be able to assign to the unique key shape, since we know that it is one or the other as input
        const uk: RefByUnique<typeof SeaTurtle> = ref;
      }
    });
  });
});
