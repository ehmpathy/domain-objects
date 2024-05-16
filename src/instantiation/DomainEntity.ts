import { DomainObject } from './DomainObject';

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
   * `DomainEntity.unique` defines the set, or sets, of the properties of the entity that the entity is naturally unique on
   *
   * For example,
   * - a `FileProcessingJob { uuid, filePath, status }` is likely going to be unique on the `filePath` if we only ever need to process the same file once.
   * - a `SupportTicket { uuid, userId, type, status }`, on the other hand, is likely only going to be unique on the `uuid`, because the same user can create the same support ticket over and over again
   * - a `GoogleAdsCampaign { resourceName, accountId, name }`, however, is probably unique on two sets of properties. First, a set containing the id assigned to it by google `[resourceName]`. Next, a set by which even google considers it unique `[accountUuid, name]`
   */
  public static unique: readonly string[] | readonly string[][];

  /**
   * `DomainEntity.updatable` defines all of the properties of the entity that are updatable
   *
   * For example,
   * - a `User { uuid, name, address, picture }` would likely have `unique = ['name', 'address', 'picture']`, to enable the user to update their information as it changes over time
   * - an `Email { uuid, externalId, toAddress, fromAddress, message, status }` is likely only going to have `status` be updatable, as by changing the `toAddress` would, in this case, make us consider it to be a different email!
   */
  public static updatable: readonly string[];
}
