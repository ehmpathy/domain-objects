import { DomainObject } from './DomainObject';

/**
 * In Domain Driven Design, an Entity is a type of Domain Object for which:
 * - properties change over time (e.g., it has a life cycle)
 * - identity matters (e.g., two entities could have the same properties, differing only by id, and still be valid)
 *
 * For example,
 * - A `User { uuid, name, address, profilePicture }` is an entity. Properties like `name`, `address`, and `profilePicture` can change over time.
 * - A `Job { uuid, requestId, status }` is an entity. We expect `status` to change over time as the job goes from, for example, `QUEUED` to `FULFILLED`.
 */
export class DomainEntity<T> extends DomainObject<T> {
  /**
   * `DomainEntity.unique` defines all of the properties of the entity that the entity is naturally unique on
   *
   * For example,
   * - a `FileProcessingJob { uuid, filePath, status }` is likely going to be unique on the `filePath` if we only ever need to process the same file once.
   * - a `SupportTicket { uuid, userId, type, status }`, on the other hand, is likely only going to be unique on the `uuid`, because the same user can create the same support ticket over and over again
   */
  public static unique: readonly string[];

  /**
   * `DomainEntity.updatable` defines all of the properties of the entity that are updatable
   *
   * For example,
   * - a `User { uuid, name, address, picture }` would likely have `unique = ['name', 'address', 'picture']`, to enable the user to update their information as it changes over time
   * - an `Email { uuid, externalId, toAddress, fromAddress, message, status }` is likely only going to have `status` be updatable, as by changing the `toAddress` would, in this case, make us consider it to be a different email!
   */
  public static updatable: readonly string[];
}
