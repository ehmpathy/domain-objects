import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { DomainEntityPrimaryKeysMustBeDefinedError } from './DomainEntityPrimaryKeysMustBeDefinedError';
import { getPrimaryIdentifier } from './getPrimaryIdentifier';

describe('getPrimaryIdentifier', () => {
  describe('literal', () => {
    it('should be able to get primary identifier accurately', () => {
      interface Address {
        uuid?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainLiteral<Address> implements Address {
        public static primary = ['uuid'] as const;
      }
      const address = new Address({
        uuid: '__uuid__',
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
      const primary = getPrimaryIdentifier(address);
      expect(primary).toEqual({
        uuid: '__uuid__',
      });
    });
    it('should return empty object, if primary keys are not defined on the instance', () => {
      interface Address {
        uuid?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainLiteral<Address> implements Address {
        public static primary = ['uuid'] as const;
      }
      const address = new Address({
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
      const primary = getPrimaryIdentifier(address);
      expect(primary).toEqual(undefined);
    });
    it('should throw an error if .primary is not defined on the literal', () => {
      interface Address {
        uuid?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}
      const address = new Address({
        uuid: '__uuid__',
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
      try {
        getPrimaryIdentifier(address);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          '`Address.primary` must be defined, to be able to `getPrimaryIdentifier`',
        );
        expect(error).toBeInstanceOf(DomainEntityPrimaryKeysMustBeDefinedError);
      }
    });
  });
  describe('entity', () => {
    it('should be able to get unique identifier accurately', () => {
      interface ShmoogleAdsCampaign {
        resourceName?: string;
        name: string;
      }
      class ShmoogleAdsCampaign
        extends DomainEntity<ShmoogleAdsCampaign>
        implements ShmoogleAdsCampaign
      {
        public static primary = ['resourceName'] as const;
        public static unique = ['name'];
      }
      const campaign = new ShmoogleAdsCampaign({
        resourceName: '__resource_name__',
        name: 'best campaign ever',
      });
      const primary = getPrimaryIdentifier(campaign);
      expect(primary).toEqual({
        resourceName: '__resource_name__',
      });
    });
    it('should throw an error if .primary is not defined on the entity', () => {
      interface ShmoogleAdsCampaign {
        resourceName?: string;
        name: string;
      }
      class ShmoogleAdsCampaign
        extends DomainEntity<ShmoogleAdsCampaign>
        implements ShmoogleAdsCampaign {}
      const campaign = new ShmoogleAdsCampaign({
        resourceName: '__resource_name__',
        name: 'best campaign ever',
      });
      try {
        getPrimaryIdentifier(campaign);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          '`ShmoogleAdsCampaign.primary` must be defined, to be able to `getPrimaryIdentifier`',
        );
        expect(error).toBeInstanceOf(DomainEntityPrimaryKeysMustBeDefinedError);
      }
    });
  });
});
