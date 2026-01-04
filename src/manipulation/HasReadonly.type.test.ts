import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import type { HasReadonly } from './HasReadonly.type';

describe('HasReadonly', () => {
  describe('DomainEntity', () => {
    describe('DeclaredAwsRdsCluster example', () => {
      interface DeclaredAwsRdsCluster {
        arn?: string;
        name: string;
        port?: number;
      }
      class DeclaredAwsRdsCluster
        extends DomainEntity<DeclaredAwsRdsCluster>
        implements DeclaredAwsRdsCluster
      {
        public static primary = ['arn'] as const;
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['port'] as const;
      }

      it('should make metadata and readonly keys required', () => {
        const cluster: HasReadonly<typeof DeclaredAwsRdsCluster> = {
          arn: '1234',
          name: 'testdb',
          port: 821,
        };

        // should be able to access port as non-optional number
        const port: number = cluster.port;
        expect(port).toBe(821);

        // should be able to access arn as non-optional string
        const arn: string = cluster.arn;
        expect(arn).toBe('1234');
      });

      it('should type-error when required readonly keys are missing', () => {
        // @ts-expect-error: Property 'port' is missing
        const cluster: HasReadonly<typeof DeclaredAwsRdsCluster> = {
          arn: '1234',
          name: 'testdb',
        };
        expect(cluster).toBeDefined();
      });

      it('should type-error when required metadata keys are missing', () => {
        // @ts-expect-error: Property 'arn' is missing
        const cluster: HasReadonly<typeof DeclaredAwsRdsCluster> = {
          name: 'testdb',
          port: 821,
        };
        expect(cluster).toBeDefined();
      });
    });

    describe('default metadata keys', () => {
      interface UserRecord {
        id?: number;
        uuid?: string;
        name: string;
        createdAt?: Date;
        updatedAt?: Date;
      }
      class UserRecord extends DomainEntity<UserRecord> implements UserRecord {
        public static primary = ['id'] as const;
        public static unique = ['uuid'] as const;
        // no explicit metadata - should use defaults
      }

      it('should use default metadata keys when metadata is not explicitly specified', () => {
        const user: HasReadonly<typeof UserRecord> = {
          id: 1,
          uuid: 'abc-123',
          name: 'John',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // default metadata keys should be required
        const id: number = user.id;
        const uuid: string = user.uuid;
        const createdAt: Date = user.createdAt;
        const updatedAt: Date = user.updatedAt;

        expect(id).toBe(1);
        expect(uuid).toBe('abc-123');
        expect(createdAt).toBeInstanceOf(Date);
        expect(updatedAt).toBeInstanceOf(Date);
      });

      it('should type-error when default metadata keys are missing', () => {
        // @ts-expect-error: Properties 'id', 'uuid', 'createdAt', 'updatedAt' are missing
        const user: HasReadonly<typeof UserRecord> = {
          name: 'John',
        };
        expect(user).toBeDefined();
      });
    });

    describe('no readonly keys', () => {
      interface SimpleEntity {
        id?: number;
        name: string;
        description?: string;
      }
      class SimpleEntity
        extends DomainEntity<SimpleEntity>
        implements SimpleEntity
      {
        public static primary = ['id'] as const;
        public static unique = ['name'] as const;
        public static metadata = ['id'] as const;
        // no readonly keys defined
      }

      it('should only require metadata keys when no readonly is specified', () => {
        const entity: HasReadonly<typeof SimpleEntity> = {
          id: 1,
          name: 'test',
          // description is still optional
        };

        const id: number = entity.id;
        expect(id).toBe(1);

        // description should still be optional
        const desc: string | undefined = entity.description;
        expect(desc).toBeUndefined();
      });
    });

    describe('AWS Lambda example with readonly', () => {
      interface DeclaredAwsLambdaFunction {
        arn?: string;
        name: string;
        lastModified?: string;
        codeSize?: number;
      }
      class DeclaredAwsLambdaFunction
        extends DomainEntity<DeclaredAwsLambdaFunction>
        implements DeclaredAwsLambdaFunction
      {
        public static primary = ['arn'] as const;
        public static unique = ['name'] as const;
        public static metadata = ['arn'] as const;
        public static readonly = ['lastModified', 'codeSize'] as const;
      }

      it('should make multiple readonly keys required', () => {
        const fn: HasReadonly<typeof DeclaredAwsLambdaFunction> = {
          arn: 'arn:aws:lambda:...',
          name: 'my-function',
          lastModified: '2024-01-01',
          codeSize: 1024,
        };

        const lastModified: string = fn.lastModified;
        const codeSize: number = fn.codeSize;

        expect(lastModified).toBe('2024-01-01');
        expect(codeSize).toBe(1024);
      });
    });

    describe('default metadata with explicit readonly', () => {
      interface ServerInstance {
        id?: number;
        uuid?: string;
        name: string;
        createdAt?: Date;
        updatedAt?: Date;
        ipAddress?: string;
        status?: string;
      }
      class ServerInstance
        extends DomainEntity<ServerInstance>
        implements ServerInstance
      {
        public static primary = ['id'] as const;
        public static unique = ['uuid'] as const;
        // no explicit metadata - should use defaults
        public static readonly = ['ipAddress', 'status'] as const;
      }

      it('should require both default metadata keys and explicit readonly keys', () => {
        const server: HasReadonly<typeof ServerInstance> = {
          id: 1,
          uuid: 'server-abc-123',
          name: 'web-server-01',
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: '192.168.1.100',
          status: 'running',
        };

        // default metadata keys should be required
        const id: number = server.id;
        const uuid: string = server.uuid;
        const createdAt: Date = server.createdAt;
        const updatedAt: Date = server.updatedAt;

        // explicit readonly keys should be required
        const ipAddress: string = server.ipAddress;
        const status: string = server.status;

        expect(id).toBe(1);
        expect(uuid).toBe('server-abc-123');
        expect(createdAt).toBeInstanceOf(Date);
        expect(updatedAt).toBeInstanceOf(Date);
        expect(ipAddress).toBe('192.168.1.100');
        expect(status).toBe('running');
      });

      it('should type-error when default metadata keys are missing', () => {
        // @ts-expect-error: Properties 'id', 'uuid', 'createdAt', 'updatedAt' are missing
        const server: HasReadonly<typeof ServerInstance> = {
          name: 'web-server-01',
          ipAddress: '192.168.1.100',
          status: 'running',
        };
        expect(server).toBeDefined();
      });

      it('should type-error when explicit readonly keys are missing', () => {
        // @ts-expect-error: Properties 'ipAddress', 'status' are missing
        const server: HasReadonly<typeof ServerInstance> = {
          id: 1,
          uuid: 'server-abc-123',
          name: 'web-server-01',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(server).toBeDefined();
      });
    });
  });

  describe('DomainLiteral', () => {
    describe('default metadata keys (acts as HasMetadata alias)', () => {
      interface Address {
        id?: number;
        uuid?: string;
        street: string;
        city: string;
        createdAt?: Date;
        updatedAt?: Date;
      }
      class Address extends DomainLiteral<Address> implements Address {
        // DomainLiterals don't have readonly - only metadata
        // no explicit metadata - should use defaults from HasMetadata
      }

      it('should use default metadata keys when metadata is not explicitly specified', () => {
        const address: HasReadonly<typeof Address> = {
          id: 1,
          uuid: 'addr-123',
          street: '123 Main St',
          city: 'Springfield',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // default metadata keys should be required
        const id: number = address.id;
        const uuid: string = address.uuid;
        const createdAt: Date = address.createdAt;
        const updatedAt: Date = address.updatedAt;

        expect(id).toBe(1);
        expect(uuid).toBe('addr-123');
        expect(createdAt).toBeInstanceOf(Date);
        expect(updatedAt).toBeInstanceOf(Date);
      });

      it('should type-error when default metadata keys are missing', () => {
        // @ts-expect-error: Properties 'id', 'uuid', 'createdAt', 'updatedAt' are missing
        const address: HasReadonly<typeof Address> = {
          street: '123 Main St',
          city: 'Springfield',
        };
        expect(address).toBeDefined();
      });
    });

    describe('explicit metadata keys', () => {
      interface Coordinate {
        id?: number;
        latitude: number;
        longitude: number;
      }
      class Coordinate extends DomainLiteral<Coordinate> implements Coordinate {
        public static metadata = ['id'] as const;
      }

      it('should use explicit metadata keys', () => {
        const coord: HasReadonly<typeof Coordinate> = {
          id: 1,
          latitude: 40.7128,
          longitude: -74.006,
        };

        const id: number = coord.id;
        expect(id).toBe(1);
      });

      it('should type-error when explicit metadata keys are missing', () => {
        // @ts-expect-error: Property 'id' is missing
        const coord: HasReadonly<typeof Coordinate> = {
          latitude: 40.7128,
          longitude: -74.006,
        };
        expect(coord).toBeDefined();
      });
    });
  });
});
