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
export abstract class DomainValueObject<T> extends DomainObject<T> {}
