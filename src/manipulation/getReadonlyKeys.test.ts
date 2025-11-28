import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { DomainObject } from '../instantiation/DomainObject';
import { getReadonlyKeys } from './getReadonlyKeys';

// Note: DomainEvent does not support explicit readonly keys because events are immutable by nature.
// All properties are known before persistence, so there's no concept of persistence-layer-set intrinsic attributes.

describe('getReadonlyKeys', () => {
  describe('DomainObject', () => {
    it('should return the default metadata keys for a plain DomainObject', () => {
      interface Mineral {
        id?: number;
        name: string;
      }
      class Mineral extends DomainObject<Mineral> implements Mineral {}
      const mineral = new Mineral({ name: 'magnesium' });
      const readonlyKeys = getReadonlyKeys(mineral);
      expect(readonlyKeys).toEqual([
        'id',
        'uuid',
        'createdAt',
        'updatedAt',
        'effectiveAt',
      ]);
    });
  });

  describe('DomainLiteral', () => {
    it('should return only metadata keys for a DomainLiteral (no explicit readonly support)', () => {
      interface Address {
        id?: number;
        city: string;
        state: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}
      const address = new Address({ city: 'Austin', state: 'TX' });
      const readonlyKeys = getReadonlyKeys(address);
      expect(readonlyKeys).toEqual([
        'id',
        'uuid',
        'createdAt',
        'updatedAt',
        'effectiveAt',
      ]);
    });

    it('should return explicitly defined metadata keys for a DomainLiteral', () => {
      interface Address {
        id?: number;
        city: string;
        state: string;
      }
      class Address extends DomainLiteral<Address> implements Address {
        public static metadata = ['id'] as const;
      }
      const address = new Address({ city: 'Austin', state: 'TX' });
      const readonlyKeys = getReadonlyKeys(address);
      expect(readonlyKeys).toEqual(['id']);
    });
  });

  describe('DomainEntity', () => {
    it('should return default metadata keys when no explicit readonly defined', () => {
      interface Booster {
        id?: number;
        uuid?: string;
        name: string;
        status: string;
      }
      class Booster extends DomainEntity<Booster> implements Booster {
        public static unique = ['name'] as const;
      }
      const booster = new Booster({ name: 'falcon9', status: 'ready' });
      const readonlyKeys = getReadonlyKeys(booster);
      expect(readonlyKeys).toEqual([
        'id',
        'uuid',
        'createdAt',
        'updatedAt',
        'effectiveAt',
      ]);
    });

    it('should return union of metadata and explicit readonly keys', () => {
      interface AwsRdsCluster {
        arn?: string;
        name: string;
        host?: string;
        port?: number;
        status?: string;
      }
      class AwsRdsCluster
        extends DomainEntity<AwsRdsCluster>
        implements AwsRdsCluster
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['host', 'port', 'status'] as const;
      }
      const cluster = new AwsRdsCluster({ name: 'my-cluster' });
      const readonlyKeys = getReadonlyKeys(cluster);
      expect(readonlyKeys).toContain('arn'); // metadata
      expect(readonlyKeys).toContain('host'); // explicit readonly
      expect(readonlyKeys).toContain('port'); // explicit readonly
      expect(readonlyKeys).toContain('status'); // explicit readonly
      expect(readonlyKeys).toHaveLength(4);
    });

    it('should dedupe overlapping metadata and readonly keys', () => {
      interface Resource {
        id?: number;
        name: string;
        resolvedId?: number; // hypothetically could be in both
      }
      class Resource extends DomainEntity<Resource> implements Resource {
        public static unique = ['name'] as const;
        public static metadata = ['id', 'resolvedId'] as const;
        public static readonly = ['resolvedId'] as const; // overlaps with metadata
      }
      const resource = new Resource({ name: 'test' });
      const readonlyKeys = getReadonlyKeys(resource);
      // Should dedupe - resolvedId appears in both but should only be listed once
      expect(readonlyKeys.filter((k) => k === 'resolvedId')).toHaveLength(1);
      expect(readonlyKeys).toContain('id');
      expect(readonlyKeys).toContain('resolvedId');
    });

    it('should not include uuid in readonly if uuid is part of unique key', () => {
      interface LotOwner {
        id?: number;
        uuid: string;
        name: string;
      }
      class LotOwner extends DomainEntity<LotOwner> implements LotOwner {
        public static unique = ['uuid'] as const;
      }
      const owner = new LotOwner({ uuid: '__uuid__', name: 'bob' });
      const readonlyKeys = getReadonlyKeys(owner);
      expect(readonlyKeys).not.toContain('uuid');
      expect(readonlyKeys).toContain('id');
    });
  });

  describe('DomainEvent', () => {
    it('should return only metadata keys (events do not support explicit readonly)', () => {
      interface ItemViewedEvent {
        id?: number;
        itemUuid: string;
        occurredAt: string;
      }
      class ItemViewedEvent
        extends DomainEvent<ItemViewedEvent>
        implements ItemViewedEvent
      {
        public static unique = ['itemUuid', 'occurredAt'] as const;
      }
      const event = new ItemViewedEvent({
        itemUuid: '__item__',
        occurredAt: '2024-01-01',
      });
      const readonlyKeys = getReadonlyKeys(event);
      // Events only have metadata as readonly - they are immutable by nature
      // and all properties are known before persistence
      expect(readonlyKeys).toEqual([
        'id',
        'uuid',
        'createdAt',
        'updatedAt',
        'effectiveAt',
      ]);
    });
  });
});
