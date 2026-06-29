import type {
  GetReadonlyKeysDeepOf,
  GetReadonlyKeysFlatOf,
} from './GetReadonlyKeysOf.type';
import type { WithKeys } from './HasReadonly.WithKeys.type';
import type { WithMetadata } from './WithMetadata.type';

/**
 * a constructor type that produces instances of type T
 */
export type ConstructorOf<T> = new (...args: any) => T;

/**
 * asserts that any optional readonly keys of the object will now be required
 *
 * this type looks at the `public static metadata` and `public static readonly`
 * attributes declared on the static properties of DomainObjects and marks them
 * all as required.
 *
 * note:
 * - leverages HasMetadata from type-fns for metadata keys
 * - uses default metadata keys (id, uuid, createdAt, updatedAt, deletedAt, effectiveAt) if metadata is not explicitly specified
 * - there is no default for readonly - only uses it if explicitly specified on the class
 * - this type does not make any other optional keys required
 * - this type does not add any properties to the type definition
 * - deep (dot-path) readonly keys (e.g. `network.interface.privateIp`) are narrowed too: the targeted deep
 *   field becomes required + non-undefined. this is applied via an intersection overlay (`T & RequiredAtPaths`),
 *   so the result stays provably assignable to the instance type and keeps the `hasReadonly` type-guard contract.
 *   a deep readonly path that traverses an array applies to the element type (every element).
 *
 * for example:
 * ```ts
 * interface DeclaredAwsRdsCluster {
 *   arn?: string;
 *   name: string;
 *   port?: number;
 * }
 * class DeclaredAwsRdsCluster extends DomainEntity<DeclaredAwsRdsCluster> implements DeclaredAwsRdsCluster {
 *   public static primary = ['arn'] as const;
 *   public static unique = ['name'] as const;
 *   public static metadata = ['arn'] as const;
 *   public static readonly = ['port'] as const;
 * }
 *
 * const cluster: HasReadonly<typeof DeclaredAwsRdsCluster> = {
 *   arn: '1234', // now required
 *   name: 'testdb',
 *   port: 821, // now required
 * };
 * ```
 */
export type HasReadonly<
  TDobj extends ConstructorOf<any>,
  TInstance extends Record<string, any> = InstanceType<TDobj>,
> = WithKeys<
  WithMetadata<TDobj, TInstance>,
  GetReadonlyKeysFlatOf<TDobj>,
  GetReadonlyKeysDeepOf<TDobj>
>;
