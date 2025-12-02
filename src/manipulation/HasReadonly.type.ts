import type { HasMetadata } from 'type-fns';

/**
 * a constructor type that produces instances of type T
 */
export type ConstructorOf<T> = new (...args: any) => T;

/**
 * extracts the metadata keys from a DomainObject class, if explicitly declared
 *
 * returns the literal tuple element union if metadata is declared with `as const`,
 * otherwise returns `never` to signal that defaults should be used
 */
type ExplicitMetadataKeysOf<TDobj> = TDobj extends { metadata: infer M }
  ? M extends readonly string[]
    ? // Check if metadata is a literal tuple (not just readonly string[])
      string extends M[number]
      ? never // type is too wide, use defaults
      : M[number]
    : never
  : never;

/**
 * extracts the readonly keys from a DomainEntity class
 *
 * if readonly is explicitly declared on the class (as const), uses those keys
 * otherwise, there are no readonly keys (empty union = never)
 */
type ReadonlyKeysOf<TDobj> = TDobj extends { readonly: infer R }
  ? R extends readonly string[]
    ? // Check if readonly is a literal tuple (not just readonly string[])
      string extends R[number]
      ? never // no default readonly keys
      : R[number]
    : never
  : never;

/**
 * applies HasMetadata with the appropriate keys based on whether metadata is explicitly declared
 */
type WithMetadata<
  TInstance extends Record<string, any>,
  TExplicitMetadataKeys,
> = [TExplicitMetadataKeys] extends [never]
  ? HasMetadata<TInstance> // use defaults from HasMetadata
  : HasMetadata<TInstance, TExplicitMetadataKeys & string>;

/**
 * applies readonly key requirements on top of an instance type
 */
type WithReadonly<TInstance extends Record<string, any>, TReadonlyKeys> = [
  TReadonlyKeys,
] extends [never]
  ? TInstance // no readonly keys to apply
  : TInstance & Required<Pick<TInstance, keyof TInstance & TReadonlyKeys>>;

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
> = WithReadonly<
  WithMetadata<TInstance, ExplicitMetadataKeysOf<TDobj>>,
  ReadonlyKeysOf<TDobj>
>;
