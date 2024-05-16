import { DomainObject } from './DomainObject';

/**
 * In Domain Driven Design, a Literal (a.k.a. Value Object), is a type of Domain Object for which:
 * - properties are immutable
 *   - i.e., it represents some literal value which happens to have a structured object shape
 *   - i.e., if you change the value of any of its properties, it is a different literal
 * - identity does not matter
 *   - i.e., it is uniquely identifiable by its non-metadata properties
 *
 * The purpose of a Domain Literal is to represent distinct, literal values which happen to have a structured object shape
 *
 * For example,
 * - A `Address { street, city, state, country }` is a literal. Changing any of the properties, like `street`, produces a completely new address
 * - A `Geocode { latitude, longitude }` is a literal. Changing either property means you are dealing with a new geocode
 */
export abstract class DomainLiteral<
  T extends Record<string, any>,
> extends DomainObject<T> {}
