import { DomainObject } from './DomainObject';
import { VERSION } from './version';

// marker symbol (cross-version, global registry)
export const MARK_AS_DOMAIN_ENTITY = Symbol.for('domain-objects/DomainEntity');

/**
 * In Domain Driven Design, an Entity is a type of Domain Object for which:
 * - properties change over time
 *   - e.g., it has a lifecycle
 * - identity matters
 *   - i.e., it represents a distinct existence
 *   - e.g., two entities could have the same properties, differing only by id, and are still considered different entities
 *   - e.g., you can update properties on an entity and it is still considered the same entity
 *
 * The purpose of a Domain Entity is to represent objects which have distinct identities, lifecycles, and existence important in the domain.
 *
 * For example,
 * - A `User { uuid, name, address, profilePicture }` is an entity. Properties like `name`, `address`, and `profilePicture` can change over time.
 * - A `Task { uuid, requestId, status }` is an entity. We expect `status` to change over time as the task goes from, for example, `QUEUED` to `FULFILLED`.
 */
export class DomainEntity<
  T extends Record<string, any>,
> extends DomainObject<T> {
  /**
   * DomainEntity marker symbol for cross-version compatibility.
   *
   * Uses Symbol.for() to create a global symbol that works across different versions
   * of the domain-objects library. The value is the version string.
   */
  public static readonly [MARK_AS_DOMAIN_ENTITY] = VERSION;

  /**
   * `DomainEntity.primary` defines the surrogate key of the domain.entity, utilized as the primary key in persistance
   *
   * for example,
   * - a `FileProcessingJob { uuid, filePath, status }` is likely going to have a primary key of `uuid`
   * - a `GoogleAdsCampaign { resourceName, accountId, name }`, however, has a primary key of `resourceName`
   *
   * ref
   * - https://en.wikipedia.org/wiki/Surrogate_key
   */
  public static primary: readonly [string]; // todo: ensure that its a keyof T; https://github.com/microsoft/TypeScript/issues/32211

  /**
   * `DomainEntity.unique` defines the natural key of the domain.entity, utilized as the unique key in persistance
   *
   * for example,
   * - a `FileProcessingJob { uuid, filePath, status }` is likely going to be unique on the `filePath` if we only ever need to process the same file once.
   * - a `SupportTicket { uuid, userId, type, status }`, on the other hand, is likely only going to be unique on the `uuid`, because the same user can create the same support ticket over and over again
   * - a `GoogleAdsCampaign { resourceName, accountId, name }`, however, is probably unique on two sets of properties. First, a set containing the id assigned to it by google `[resourceName]`. Next, a set by which even google considers it unique `[accountUuid, name]`
   *
   * ref
   * - https://en.wikipedia.org/wiki/Natural_key
   */
  public static unique: readonly string[]; // todo: support alternate unique keys, in addition to the unique identity key; todo: ensure that its a keyof T; https://github.com/microsoft/TypeScript/issues/32211

  /**
   * `DomainEntity.updatable` defines all of the properties of the entity that are updatable
   *
   * for example,
   * - a `User { uuid, name, address, picture }` would likely have `unique = ['name', 'address', 'picture']`, to enable the user to update their information as it changes over time
   * - an `Email { uuid, externalId, toAddress, fromAddress, message, status }` is likely only going to have `status` be updatable, as by changing the `toAddress` would, in this case, make us consider it to be a different email!
   */
  public static updatable: readonly string[];

  /**
   * `DomainEntity.readonly` defines intrinsic domain attributes that are set by the persistence layer.
   *
   * Both metadata and readonly are set by the persistence layer, but they differ in what they describe:
   * - metadata describes the persistence of the object (e.g., id, uuid, createdAt) - not the object itself
   * - readonly (non-metadata) describes intrinsic attributes of the object that the persistence layer sets
   *
   * Note: metadata is already a special subset of readonly. This property is for non-metadata readonly attributes.
   *
   * Note: only DomainEntity supports explicit readonly keys, not DomainEvent or DomainLiteral.
   * - DomainEvent: immutable by nature, all properties are known before persistence
   * - DomainLiteral: immutable by nature, fully defined by intrinsic properties
   *
   * for example,
   * - a `DeclaredAwsRdsCluster { arn, name, host, port, status }` has `metadata = ['arn']` (AWS-assigned identity)
   *   and `readonly = ['host', 'port', 'status']` (AWS-resolved attributes that describe the cluster)
   * - a `DeclaredAwsLambdaFunction { arn, name, lastModified, codeSize }` has `readonly = ['lastModified', 'codeSize']`
   *   as these are resolved from AWS and describe real attributes of the function
   */
  public static readonly: readonly string[];
}
