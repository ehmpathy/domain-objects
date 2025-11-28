import Joi from 'joi';

import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { omitReadonly } from './omitReadonly';

describe('omitReadonly', () => {
  describe('literal', () => {
    it('should correctly omit metadata values (the only readonly for literals)', () => {
      interface Address {
        id?: number;
        uuid?: string;
        city: string;
        state: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}

      const address = new Address({
        id: 1,
        uuid: '__uuid__',
        city: 'Austin',
        state: 'TX',
      });

      const addressWithoutReadonly = omitReadonly(address);
      expect(addressWithoutReadonly.id).toBeUndefined();
      expect(addressWithoutReadonly.uuid).toBeUndefined();
      expect(addressWithoutReadonly.city).toBe('Austin');
      expect(addressWithoutReadonly.state).toBe('TX');
      expect(addressWithoutReadonly).toBeInstanceOf(Address);
    });
  });

  describe('entity', () => {
    it('should correctly omit only metadata values when no explicit readonly defined', () => {
      interface Booster {
        id?: number;
        uuid?: string;
        createdAt?: string;
        updatedAt?: string;
        effectiveAt?: string;
        name: string;
        status: string;
      }
      class Booster extends DomainEntity<Booster> implements Booster {
        public static unique = ['name'] as const;
      }

      const booster = new Booster({
        id: 1,
        uuid: '__uuid__',
        createdAt: '__created__',
        updatedAt: '__updated__',
        effectiveAt: '__effective__',
        name: 'falcon9',
        status: 'ready',
      });

      const boosterWithoutReadonly = omitReadonly(booster);
      expect(boosterWithoutReadonly.id).toBeUndefined();
      expect(boosterWithoutReadonly.uuid).toBeUndefined();
      expect(boosterWithoutReadonly.createdAt).toBeUndefined();
      expect(boosterWithoutReadonly.updatedAt).toBeUndefined();
      expect(boosterWithoutReadonly.effectiveAt).toBeUndefined();
      expect(boosterWithoutReadonly.name).toBe('falcon9');
      expect(boosterWithoutReadonly.status).toBe('ready');
      expect(boosterWithoutReadonly).toBeInstanceOf(Booster);
    });

    it('should correctly omit both metadata and explicit readonly values', () => {
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

      const cluster = new AwsRdsCluster({
        arn: 'arn:aws:rds:...',
        name: 'my-cluster',
        host: 'my-cluster.xxx.us-east-1.rds.amazonaws.com',
        port: 5432,
        status: 'available',
      });

      const clusterWithoutReadonly = omitReadonly(cluster);
      expect(clusterWithoutReadonly.arn).toBeUndefined(); // metadata
      expect(clusterWithoutReadonly.host).toBeUndefined(); // explicit readonly
      expect(clusterWithoutReadonly.port).toBeUndefined(); // explicit readonly
      expect(clusterWithoutReadonly.status).toBeUndefined(); // explicit readonly
      expect(clusterWithoutReadonly.name).toBe('my-cluster'); // user-settable
      expect(clusterWithoutReadonly).toBeInstanceOf(AwsRdsCluster);
    });

    it('should correctly omit readonly values from an array of entities', () => {
      interface AwsRdsCluster {
        arn?: string;
        name: string;
        host?: string;
      }
      class AwsRdsCluster
        extends DomainEntity<AwsRdsCluster>
        implements AwsRdsCluster
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['host'] as const;
      }

      const clusters = [
        new AwsRdsCluster({
          arn: 'arn:1',
          name: 'cluster-1',
          host: 'host-1',
        }),
        new AwsRdsCluster({
          arn: 'arn:2',
          name: 'cluster-2',
          host: 'host-2',
        }),
      ];

      const clustersWithoutReadonly = omitReadonly(clusters);
      expect(clustersWithoutReadonly[0]?.arn).toBeUndefined();
      expect(clustersWithoutReadonly[0]?.host).toBeUndefined();
      expect(clustersWithoutReadonly[0]?.name).toBe('cluster-1');
      expect(clustersWithoutReadonly[1]?.arn).toBeUndefined();
      expect(clustersWithoutReadonly[1]?.host).toBeUndefined();
      expect(clustersWithoutReadonly[1]?.name).toBe('cluster-2');
    });

    it('should correctly _not_ omit uuid when uuid is part of unique key', () => {
      interface Resource {
        id?: number;
        uuid: string;
        name: string;
        resolvedValue?: string;
      }
      class Resource extends DomainEntity<Resource> implements Resource {
        public static unique = ['uuid'] as const;
        public static readonly = ['resolvedValue'] as const;
      }

      const resource = new Resource({
        id: 1,
        uuid: '__uuid__',
        name: 'test',
        resolvedValue: 'resolved',
      });

      const resourceWithoutReadonly = omitReadonly(resource);
      expect(resourceWithoutReadonly.id).toBeUndefined(); // metadata
      expect(resourceWithoutReadonly.uuid).toBe('__uuid__'); // NOT metadata because it's in unique
      expect(resourceWithoutReadonly.resolvedValue).toBeUndefined(); // explicit readonly
      expect(resourceWithoutReadonly.name).toBe('test');
    });

    it('should work with schema validation', () => {
      const schema = Joi.object().keys({
        arn: Joi.string().optional(),
        name: Joi.string().required(),
        host: Joi.string().optional(),
      });
      interface AwsRdsCluster {
        arn?: string;
        name: string;
        host?: string;
      }
      class AwsRdsCluster
        extends DomainEntity<AwsRdsCluster>
        implements AwsRdsCluster
      {
        public static schema = schema;
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['host'] as const;
      }

      const cluster = new AwsRdsCluster({
        arn: 'arn:aws:rds:...',
        name: 'my-cluster',
        host: 'my-cluster.xxx.us-east-1.rds.amazonaws.com',
      });

      const clusterWithoutReadonly = omitReadonly(cluster);
      expect(clusterWithoutReadonly.arn).toBeUndefined();
      expect(clusterWithoutReadonly.host).toBeUndefined();
      expect(clusterWithoutReadonly.name).toBe('my-cluster');
      expect(clusterWithoutReadonly).toBeInstanceOf(AwsRdsCluster);
    });
  });

  describe('event', () => {
    it('should correctly omit only metadata from events (events do not support explicit readonly)', () => {
      // Note: DomainEvent does not support explicit readonly keys because events are immutable by nature.
      // All properties are known before persistence, so there's no concept of persistence-layer-set intrinsic attributes.
      interface PaymentProcessedEvent {
        id?: number;
        paymentId: string;
        occurredAt: string;
        processorResponse: string;
        processorFee: number;
      }
      class PaymentProcessedEvent
        extends DomainEvent<PaymentProcessedEvent>
        implements PaymentProcessedEvent
      {
        public static unique = ['paymentId', 'occurredAt'] as const;
      }

      const event = new PaymentProcessedEvent({
        id: 1,
        paymentId: '__payment__',
        occurredAt: '2024-01-01',
        processorResponse: 'approved',
        processorFee: 2.5,
      });

      const eventWithoutReadonly = omitReadonly(event);
      expect(eventWithoutReadonly.id).toBeUndefined(); // default metadata
      // Non-metadata properties are preserved for events (they don't have explicit readonly)
      expect(eventWithoutReadonly.processorResponse).toBe('approved');
      expect(eventWithoutReadonly.processorFee).toBe(2.5);
      expect(eventWithoutReadonly.paymentId).toBe('__payment__');
      expect(eventWithoutReadonly.occurredAt).toBe('2024-01-01');
      expect(eventWithoutReadonly).toBeInstanceOf(PaymentProcessedEvent);
    });
  });

  describe('nested', () => {
    it('should correctly omit readonly values from nested domain objects', () => {
      interface Address {
        id?: number;
        city: string;
        state: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}

      interface AwsRdsCluster {
        arn?: string;
        name: string;
        host?: string;
        address: Address;
      }
      class AwsRdsCluster
        extends DomainEntity<AwsRdsCluster>
        implements AwsRdsCluster
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['host'] as const;
        public static nested = { address: Address };
      }

      const cluster = new AwsRdsCluster({
        arn: 'arn:aws:rds:...',
        name: 'my-cluster',
        host: 'my-cluster.xxx.us-east-1.rds.amazonaws.com',
        address: new Address({ id: 1, city: 'Austin', state: 'TX' }),
      });

      const clusterWithoutReadonly = omitReadonly(cluster);
      expect(clusterWithoutReadonly.arn).toBeUndefined();
      expect(clusterWithoutReadonly.host).toBeUndefined();
      expect(clusterWithoutReadonly.name).toBe('my-cluster');
      expect(clusterWithoutReadonly.address.id).toBeUndefined(); // nested metadata
      expect(clusterWithoutReadonly.address.city).toBe('Austin');
    });

    it('should correctly omit readonly values from arrays of nested domain objects', () => {
      interface Photo {
        id?: number;
        url: string;
      }
      class Photo extends DomainLiteral<Photo> implements Photo {}

      interface AwsRdsCluster {
        arn?: string;
        name: string;
        host?: string;
        photos: Photo[];
      }
      class AwsRdsCluster
        extends DomainEntity<AwsRdsCluster>
        implements AwsRdsCluster
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['host'] as const;
        public static nested = { photos: Photo };
      }

      const cluster = new AwsRdsCluster({
        arn: 'arn:aws:rds:...',
        name: 'my-cluster',
        host: 'my-cluster.xxx.us-east-1.rds.amazonaws.com',
        photos: [
          new Photo({ id: 1, url: 'https://1' }),
          new Photo({ id: 2, url: 'https://2' }),
        ],
      });

      const clusterWithoutReadonly = omitReadonly(cluster);
      expect(clusterWithoutReadonly.arn).toBeUndefined();
      expect(clusterWithoutReadonly.host).toBeUndefined();
      expect(clusterWithoutReadonly.photos[0]?.id).toBeUndefined();
      expect(clusterWithoutReadonly.photos[0]?.url).toBe('https://1');
      expect(clusterWithoutReadonly.photos[1]?.id).toBeUndefined();
      expect(clusterWithoutReadonly.photos[1]?.url).toBe('https://2');
    });
  });
});
