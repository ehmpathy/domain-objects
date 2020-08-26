import { DomainObject } from './DomainObject';

/**
 * In Domain Driven Design, a Value Object is a type of Domain Object for which:
 * - is immutable (i.e, properties do not change over time)
 * - is defined by its properties (i.e., it is uniquely identified by the composition of all of its properties)
 *
 * For example,
 * - A `Address { street, city, state, country }` is a value object. Changing any of the properties, like `street`, produces a completely new address
 * - A `Name { first, last }` is a value object. Changing either property means you are dealing with a new name.
 */
export abstract class DomainValueObject<T> extends DomainObject<T> {}
