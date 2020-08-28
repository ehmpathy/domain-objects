import { DomainObject } from './DomainObject';

/**
 * In Domain Driven Design, a Value Object is a type of Domain Object for which:
 * - properties are immutable (e.g., its a fact)
 * - identity does not matter
 *   - i.e., it is uniquely identifiable by its properties
 *   - i.e., if you change the value of any of its properties, it is now considered a new value-object
 *
 * For example,
 * - A `Address { street, city, state, country }` is a value object. Changing any of the properties, like `street`, produces a completely new address
 * - A `Name { first, last }` is a value object. Changing either property means you are dealing with a new name.
 */
export abstract class DomainValueObject<T> extends DomainObject<T> {}
