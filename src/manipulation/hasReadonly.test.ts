import { AssureIsOfTypeRejectionError } from 'type-fns';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { DomainObjectMetadataMustBeDefinedError } from './DomainObjectMetadataMustBeDefinedError';
import { hasReadonly } from './hasReadonly';

describe('hasReadonly', () => {
  describe('DomainEntity', () => {
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

    it('should return true when all readonly keys are defined', () => {
      const cluster = new DeclaredAwsRdsCluster({
        arn: '1234',
        name: 'testdb',
        port: 821,
      });

      expect(hasReadonly({ of: DeclaredAwsRdsCluster })(cluster)).toBe(true);
    });

    it('should return false when metadata key is undefined', () => {
      const cluster = new DeclaredAwsRdsCluster({
        name: 'testdb',
        port: 821,
      });

      expect(hasReadonly({ of: DeclaredAwsRdsCluster })(cluster)).toBe(false);
    });

    it('should return false when explicit readonly key is undefined', () => {
      const cluster = new DeclaredAwsRdsCluster({
        arn: '1234',
        name: 'testdb',
      });

      expect(hasReadonly({ of: DeclaredAwsRdsCluster })(cluster)).toBe(false);
    });

    it('should narrow the type when used as a type guard', () => {
      const cluster = new DeclaredAwsRdsCluster({
        arn: '1234',
        name: 'testdb',
        port: 821,
      });

      if (hasReadonly({ of: DeclaredAwsRdsCluster })(cluster)) {
        // prove that the type was narrowed - these assignments should compile
        const arn: string = cluster.arn;
        const port: number = cluster.port;
        expect(arn).toBe('1234');
        expect(port).toBe(821);
      }

      // prove that the type is NOT narrowed outside the if block
      // @ts-expect-error: Type 'string | undefined' is not assignable to type 'string'
      const arnOutside: string = cluster.arn;
      // @ts-expect-error: Type 'number | undefined' is not assignable to type 'number'
      const portOutside: number = cluster.port;
      expect(arnOutside).toBe('1234');
      expect(portOutside).toBe(821);
    });

    describe('.assess', () => {
      it('should work the same as the default call', () => {
        const clusterWithReadonly = new DeclaredAwsRdsCluster({
          arn: '1234',
          name: 'testdb',
          port: 821,
        });
        const clusterWithoutReadonly = new DeclaredAwsRdsCluster({
          name: 'testdb',
        });

        expect(
          hasReadonly({ of: DeclaredAwsRdsCluster }).assess(
            clusterWithReadonly,
          ),
        ).toBe(true);
        expect(
          hasReadonly({ of: DeclaredAwsRdsCluster }).assess(
            clusterWithoutReadonly,
          ),
        ).toBe(false);
      });
    });

    describe('.assure', () => {
      it('should return the object when all readonly keys are defined', () => {
        const cluster = new DeclaredAwsRdsCluster({
          arn: '1234',
          name: 'testdb',
          port: 821,
        });

        const assured = hasReadonly({ of: DeclaredAwsRdsCluster }).assure(
          cluster,
        );

        // prove that the type was narrowed - these assignments should compile
        const arn: string = assured.arn;
        const port: number = assured.port;
        expect(arn).toBe('1234');
        expect(port).toBe(821);
      });

      it('should throw AssureIsOfTypeRejectionError when readonly keys are missing', () => {
        const cluster = new DeclaredAwsRdsCluster({
          name: 'testdb',
        });

        expect(() =>
          hasReadonly({ of: DeclaredAwsRdsCluster }).assure(cluster),
        ).toThrow(AssureIsOfTypeRejectionError);
      });
    });
  });

  describe('DomainEntity without explicit metadata', () => {
    interface ServerInstance {
      id?: number;
      uuid?: string;
      name: string;
      ipAddress?: string;
    }
    class ServerInstance
      extends DomainEntity<ServerInstance>
      implements ServerInstance
    {
      public static primary = ['id'] as const;
      public static unique = ['uuid'] as const;
      // no explicit metadata - should fail fast
      public static readonly = ['ipAddress'] as const;
    }

    it('should throw an error when metadata is not explicitly declared', () => {
      const server = new ServerInstance({
        id: 1,
        uuid: 'server-123',
        name: 'web-01',
        ipAddress: '192.168.1.1',
      });

      expect(() => hasReadonly({ of: ServerInstance })(server)).toThrow(
        DomainObjectMetadataMustBeDefinedError,
      );
    });
  });

  describe('DomainLiteral', () => {
    interface Address {
      id?: number;
      street: string;
      city: string;
    }
    class Address extends DomainLiteral<Address> implements Address {
      public static metadata = ['id'] as const;
    }

    it('should return true when all metadata keys are defined', () => {
      const address = new Address({
        id: 1,
        street: '123 Main St',
        city: 'Springfield',
      });

      expect(hasReadonly({ of: Address })(address)).toBe(true);
    });

    it('should return false when metadata key is undefined', () => {
      const address = new Address({
        street: '123 Main St',
        city: 'Springfield',
      });

      expect(hasReadonly({ of: Address })(address)).toBe(false);
    });

    it('should narrow the type when used as a type guard', () => {
      const address = new Address({
        id: 1,
        street: '123 Main St',
        city: 'Springfield',
      });

      if (hasReadonly({ of: Address })(address)) {
        // prove that the type was narrowed - this assignment should compile
        const id: number = address.id;
        expect(id).toBe(1);
      }

      // prove that the type is NOT narrowed outside the if block
      // @ts-expect-error: Type 'number | undefined' is not assignable to type 'number'
      const idOutside: number = address.id;
      expect(idOutside).toBe(1);
    });

    describe('.assure', () => {
      it('should return the object with narrowed type when metadata is defined', () => {
        const address = new Address({
          id: 1,
          street: '123 Main St',
          city: 'Springfield',
        });

        const assured = hasReadonly({ of: Address }).assure(address);

        // prove that the type was narrowed - this assignment should compile
        const id: number = assured.id;
        expect(id).toBe(1);
      });

      it('should throw AssureIsOfTypeRejectionError when metadata is missing', () => {
        const address = new Address({
          street: '123 Main St',
          city: 'Springfield',
        });

        expect(() => hasReadonly({ of: Address }).assure(address)).toThrow(
          AssureIsOfTypeRejectionError,
        );
      });
    });
  });

  describe('DomainLiteral without explicit metadata', () => {
    interface Coordinate {
      id?: number;
      latitude: number;
      longitude: number;
    }
    class Coordinate extends DomainLiteral<Coordinate> implements Coordinate {
      // no explicit metadata - should fail fast
    }

    it('should throw an error when metadata is not explicitly declared', () => {
      const coord = new Coordinate({
        id: 1,
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(() => hasReadonly({ of: Coordinate })(coord)).toThrow(
        DomainObjectMetadataMustBeDefinedError,
      );
    });
  });
});
