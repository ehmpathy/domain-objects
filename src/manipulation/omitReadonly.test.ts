import Joi from 'joi';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainEvent } from '@src/instantiation/DomainEvent';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { omitReadonly } from './omitReadonly';
import { serialize } from './serde/serialize';

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

  describe('nested readonly (dot-path, declared from entity grain)', () => {
    // a stateless, reusable network interface literal; it cannot self-declare readonly
    interface AwsNetworkInterface {
      publicIpEnabled: boolean; // settable by the user
      privateIp?: string; // aws-resolved (readonly, declared from the entity)
      publicIp?: string; // aws-resolved (readonly, declared from the entity)
    }
    class AwsNetworkInterface
      extends DomainLiteral<AwsNetworkInterface>
      implements AwsNetworkInterface {}

    interface AwsNetwork {
      subnet: string;
      interface: AwsNetworkInterface;
    }
    class AwsNetwork extends DomainLiteral<AwsNetwork> implements AwsNetwork {
      public static nested = { interface: AwsNetworkInterface };
    }

    interface AwsEc2Instance {
      arn?: string;
      name: string;
      network: AwsNetwork;
    }
    class AwsEc2Instance
      extends DomainEntity<AwsEc2Instance>
      implements AwsEc2Instance
    {
      public static unique = ['name'] as const;
      public static metadata = ['arn'] as const;
      public static readonly = [
        'network.interface.privateIp',
        'network.interface.publicIp',
      ] as const;
      public static nested = { network: AwsNetwork };
    }

    it('should drop a deeply nested readonly field while it keeps settable peers', () => {
      const instance = new AwsEc2Instance({
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({
            publicIpEnabled: true,
            privateIp: '10.0.0.5',
            publicIp: '54.0.0.5',
          }),
        }),
      });

      const without = omitReadonly(instance);
      expect(without.arn).toBeUndefined(); // top-level metadata
      expect(without.name).toBe('web-1'); // settable
      expect(without.network.subnet).toBe('subnet-abc'); // settable peer kept
      expect(without.network.interface.publicIpEnabled).toBe(true); // settable peer kept
      expect(without.network.interface.privateIp).toBeUndefined(); // nested readonly dropped
      expect(without.network.interface.publicIp).toBeUndefined(); // nested readonly dropped
      expect(without).toBeInstanceOf(AwsEc2Instance);
      expect(without.network).toBeInstanceOf(AwsNetwork);
      expect(without.network.interface).toBeInstanceOf(AwsNetworkInterface);
    });

    it('should drop both a flat explicit-readonly key and a nested readonly path declared together', () => {
      interface AwsEc2InstanceMixed {
        arn?: string;
        name: string;
        instanceType?: string; // flat, aws-resolved (explicit readonly, non-metadata)
        network: AwsNetwork;
      }
      class AwsEc2InstanceMixed
        extends DomainEntity<AwsEc2InstanceMixed>
        implements AwsEc2InstanceMixed
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = [
          'instanceType', // flat explicit readonly
          'network.interface.privateIp', // nested readonly
        ] as const;
        public static nested = { network: AwsNetwork };
      }

      const instance = new AwsEc2InstanceMixed({
        arn: 'arn:aws:ec2:...',
        name: 'web-mixed',
        instanceType: 't3.micro',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({
            publicIpEnabled: true,
            privateIp: '10.0.0.5',
          }),
        }),
      });

      const without = omitReadonly(instance);
      expect(without.arn).toBeUndefined(); // metadata
      expect(without.instanceType).toBeUndefined(); // flat explicit readonly dropped
      expect(without.network.interface.privateIp).toBeUndefined(); // nested readonly dropped
      expect(without.name).toBe('web-mixed'); // settable kept
      expect(without.network.subnet).toBe('subnet-abc'); // settable kept
      expect(without.network.interface.publicIpEnabled).toBe(true); // settable kept
    });

    it('should apply a nested readonly path to every element of a nested array', () => {
      interface AwsEc2InstanceMultinic {
        arn?: string;
        name: string;
        interfaces: AwsNetworkInterface[];
      }
      class AwsEc2InstanceMultinic
        extends DomainEntity<AwsEc2InstanceMultinic>
        implements AwsEc2InstanceMultinic
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['interfaces.privateIp'] as const;
        public static nested = { interfaces: AwsNetworkInterface };
      }

      const instance = new AwsEc2InstanceMultinic({
        arn: 'arn:aws:ec2:...',
        name: 'web-2',
        interfaces: [
          new AwsNetworkInterface({
            publicIpEnabled: true,
            privateIp: '10.0.0.5',
          }),
          new AwsNetworkInterface({
            publicIpEnabled: false,
            privateIp: '10.0.0.6',
          }),
        ],
      });

      const without = omitReadonly(instance);
      expect(without.interfaces[0]?.privateIp).toBeUndefined(); // every element
      expect(without.interfaces[0]?.publicIpEnabled).toBe(true); // settable kept
      expect(without.interfaces[1]?.privateIp).toBeUndefined(); // every element
      expect(without.interfaces[1]?.publicIpEnabled).toBe(false); // settable kept
    });

    it('should treat a declared-but-unresolved nested readonly field as a no-op', () => {
      const declared = new AwsEc2Instance({
        name: 'web-1',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({ publicIpEnabled: true }), // privateIp not resolved yet
        }),
      });

      const without = omitReadonly(declared);
      expect(without.network.interface.privateIp).toBeUndefined();
      expect(without.network.interface.publicIpEnabled).toBe(true);
    });

    it('should fail-fast when a nested path traverses a plain object not declared in static nested', () => {
      interface BadInstance {
        name: string;
        network: { interface: { privateIp?: string } }; // plain object, NOT declared in static nested
      }
      class BadInstance
        extends DomainEntity<BadInstance>
        implements BadInstance
      {
        public static unique = ['name'] as const;
        public static readonly = ['network.interface.privateIp'] as const;
        // note: no static nested, so `network` stays a plain object
      }

      const instance = new BadInstance({
        name: 'bad',
        network: { interface: { privateIp: '10.0.0.9' } },
      });

      // the framework's safety assertion catches the misconfiguration (plain nested object) and points at `static nested`
      expect(() => omitReadonly(instance)).toThrow(/not safe to manipulate/);
    });

    it('should fail-fast when a nested readonly path traverses a primitive value', () => {
      interface ScalarInstance {
        name: string;
      }
      class ScalarInstance
        extends DomainEntity<ScalarInstance>
        implements ScalarInstance
      {
        public static unique = ['name'] as const;
        public static readonly = ['name.privateIp'] as const; // `name` is a string; the path cannot descend into it
      }

      const instance = new ScalarInstance({ name: 'web-9' });

      expect(() => omitReadonly(instance)).toThrow(
        /expected a domain object to descend into/,
      );
    });

    it('should fail-fast when a nested readonly path references a property absent from the object', () => {
      interface TypoInstance {
        arn?: string;
        name: string;
        network: AwsNetwork;
      }
      class TypoInstance
        extends DomainEntity<TypoInstance>
        implements TypoInstance
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['network.notAField.x'] as const; // `notAField` is not a property of AwsNetwork
        public static nested = { network: AwsNetwork };
      }

      const instance = new TypoInstance({
        arn: 'arn:aws:ec2:...',
        name: 'web-typo',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({ publicIpEnabled: true }),
        }),
      });

      expect(() => omitReadonly(instance)).toThrow(
        /references a property that is not present on the object/,
      );
    });

    it('should drop a nested readonly field three levels deep', () => {
      interface DeepInterface {
        publicIpEnabled: boolean;
        meta?: DeepMeta;
      }
      interface DeepMeta {
        label: string;
        serial?: string; // resolved (readonly), reached via network.interface.meta.serial
      }
      class DeepMeta extends DomainLiteral<DeepMeta> implements DeepMeta {}
      class DeepInterface
        extends DomainLiteral<DeepInterface>
        implements DeepInterface
      {
        public static nested = { meta: DeepMeta };
      }

      interface DeepNetwork {
        subnet: string;
        interface: DeepInterface;
      }
      class DeepNetwork
        extends DomainLiteral<DeepNetwork>
        implements DeepNetwork
      {
        public static nested = { interface: DeepInterface };
      }

      interface DeepInstance {
        arn?: string;
        name: string;
        network: DeepNetwork;
      }
      class DeepInstance
        extends DomainEntity<DeepInstance>
        implements DeepInstance
      {
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['network.interface.meta.serial'] as const; // 3 nested levels
        public static nested = { network: DeepNetwork };
      }

      const instance = new DeepInstance({
        arn: 'arn:aws:ec2:...',
        name: 'web-deep',
        network: new DeepNetwork({
          subnet: 'subnet-abc',
          interface: new DeepInterface({
            publicIpEnabled: true,
            meta: new DeepMeta({ label: 'nic-0', serial: 'SN-123' }),
          }),
        }),
      });

      const without = omitReadonly(instance);
      expect(without.network.interface.meta?.serial).toBeUndefined(); // deep readonly dropped
      expect(without.network.interface.meta?.label).toBe('nic-0'); // settable kept
      expect(without.network.interface.publicIpEnabled).toBe(true); // settable kept
    });

    it('should reconstruct cleanly when nested readonly fields are schema-optional', () => {
      const schema = Joi.object().keys({
        publicIpEnabled: Joi.boolean().required(),
        privateIp: Joi.string().optional(), // readonly => must be optional so omit-then-reconstruct passes
        publicIp: Joi.string().optional(),
      });
      interface ValidatedInterface {
        publicIpEnabled: boolean;
        privateIp?: string;
        publicIp?: string;
      }
      class ValidatedInterface
        extends DomainLiteral<ValidatedInterface>
        implements ValidatedInterface
      {
        public static schema = schema;
      }

      interface ValidatedNetwork {
        subnet: string;
        interface: ValidatedInterface;
      }
      class ValidatedNetwork
        extends DomainLiteral<ValidatedNetwork>
        implements ValidatedNetwork
      {
        public static nested = { interface: ValidatedInterface };
      }

      interface ValidatedInstance {
        name: string;
        network: ValidatedNetwork;
      }
      class ValidatedInstance
        extends DomainEntity<ValidatedInstance>
        implements ValidatedInstance
      {
        public static unique = ['name'] as const;
        public static readonly = ['network.interface.privateIp'] as const;
        public static nested = { network: ValidatedNetwork };
      }

      const instance = new ValidatedInstance({
        name: 'web-3',
        network: new ValidatedNetwork({
          subnet: 'subnet-xyz',
          interface: new ValidatedInterface({
            publicIpEnabled: true,
            privateIp: '10.0.0.7',
          }),
        }),
      });

      const without = omitReadonly(instance);
      expect(without.network.interface.privateIp).toBeUndefined();
      expect(without.network.interface.publicIpEnabled).toBe(true);
    });

    it('should make declared-vs-resolved serialize equal (no false drift) after omit', () => {
      // declared: privateIp not yet resolved
      const declared = new AwsEc2Instance({
        name: 'web-1',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({ publicIpEnabled: true }),
        }),
      });

      // resolved: aws filled in privateIp + publicIp + arn
      const resolved = new AwsEc2Instance({
        arn: 'arn:aws:ec2:...',
        name: 'web-1',
        network: new AwsNetwork({
          subnet: 'subnet-abc',
          interface: new AwsNetworkInterface({
            publicIpEnabled: true,
            privateIp: '10.0.0.5',
            publicIp: '54.0.0.5',
          }),
        }),
      });

      // before omit: they serialize differently (drift would false-positive)
      expect(serialize(declared)).not.toBe(serialize(resolved));

      // after omit: the nested readonly is dropped on both sides => equal => no false drift
      expect(serialize(omitReadonly(declared))).toBe(
        serialize(omitReadonly(resolved)),
      );
    });
  });
});
