import { DomainObject } from './DomainObject';

/**
 * In Domain Driven Design, a Value Object is a type of Domain Object for which:
 * - properties are immutable
 * - identity does not matter
 *   - i.e., it is uniquely identifiable by its non-metadata properties
 *   - i.e., if you change the value of any of its non-metadata properties, it is now considered a new value-object
 *
 * The purpose of a Domain Value Object is to represent interesting objects for which distinct identities and life cycles are not relevant in the domain.
 *
 * For example,
 * - A `Address { street, city, state, country }` is a value object. Changing any of the properties, like `street`, produces a completely new address
 * - A `Geocode { latitude, longitude }` is a value object. Changing either property means you are dealing with a new name.
 */
export abstract class DomainValueObject<T> extends DomainObject<T> {
  /**
   * `DomainValueObject.metadata` defines all of the properties of the value object that are exclusively metadata and do not contribute to the value object's definition
   *
   * Relevance,
   * - metadata properties do not contribute to the value object's unique key, since they are not part of the value object's definition
   * - metadata simply adds information _about_ the value object, without contributing to _defining_ the value object
   *
   * By default,
   * - 'id' and 'uuid' are considered the metadata keys
   *
   * For example,
   * - an `Address { uuid, street, city, state, country }` likely has a database generated metadata property of `['uuid']`
   * - an `Geocode { id, createdAt, latitude, longitude }` likely has the database generated metadata properties of `['id', 'createdAt']`
   */
  public static metadata: readonly string[];
}
