/** biome-ignore-all lint/suspicious/noExplicitAny: in this file, we depend on `any` to make it generic enough to reuse */

import type { Ref as RefType } from '../reference/Ref.type';
import type { DomainObjectShape, Refable } from '../reference/Refable';
import { refByUnique } from '../reference/refByUnique';
import { DomainLiteral } from './DomainLiteral';
import { isOfDomainEntity } from './inherit/isOfDomainEntity';
import { isOfDomainEvent } from './inherit/isOfDomainEvent';

/**
 * In Domain Driven Design, a Reference is a special type of Domain Literal that represents a reference to another Domain Object.
 *
 * A Domain Reference:
 * - contains only the identifying properties of the referenced object
 * - is immutable (like all Domain Literals)
 * - is used to refer to Domain Entities or Domain Events without including their full data
 *
 * The purpose of a Domain Reference is to enable lightweight references between domain objects without circular dependencies or data duplication.
 *
 * For example:
 * - A `SeaTurtleRef { uuid: string }` is a reference to a SeaTurtle by its primary key
 * - A `SeaTurtleRef { seawaterSecurityNumber: string }` is a reference to a SeaTurtle by its unique key
 *
 * Note:
 * - `Ref` is a flexible reference type that accepts either primary or unique key references
 * - Use `RefByPrimary` or `RefByUnique` when you need to be specific about the reference type
 */
export type Ref<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types, when typescript supports constructor inference from instances
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = RefType<TDobj, TShape, TPrimary, TUnique>;

// extend the domain literal into a custom class, so that we can rename it into Ref, without mutating the global DomainLiteral class
class RefBase<T extends DomainObjectShape> extends DomainLiteral<T> {
  public static metadata = [] as const;

  constructor(props: T) {
    // if props itself is a domain entity or domain event, extract its reference (using unique keys as the default)
    if (isOfDomainEntity(props) || isOfDomainEvent(props)) {
      super(refByUnique(props as any) as T);
      return;
    }

    // if props is not itself a domain entity/event, check each property
    // and apply refByUnique on any nested domain entities/events
    const transformedProps: Record<string, any> = {};
    for (const key of Object.keys(props)) {
      const value = (props as any)[key];
      if (
        value &&
        typeof value === 'object' &&
        (isOfDomainEntity(value) || isOfDomainEvent(value))
      ) {
        transformedProps[key] = Ref.as(value);
      } else {
        transformedProps[key] = value;
      }
    }
    super(transformedProps as T);
  }
}

// create a constructor for Ref, so that we can instantiate references
// todo: actually use a class and extend DomainLiteral, when typescript supports more specialized types for classes; for now, we create a constructor via a procedure
export const Ref: {
  new <
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >(
    props: Ref<TDobj, TShape, TPrimary, TUnique>,
  ): Ref<TDobj, TShape, TPrimary, TUnique>;

  /**
   * .what = an interface via which to construct instances w/ immute operations
   *
   * .why =
   *   - immute operations such as .clone produce more maintainable code by preventing unexpected mutations
   *   - these immute operations provide a safe pit of success for common operations
   */
  build<
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >(
    props: Ref<TDobj, TShape, TPrimary, TUnique>,
  ): Ref<TDobj, TShape, TPrimary, TUnique>;

  /**
   * .what = an interface via which to construct instances w/ immute operations
   *
   * .why =
   *   - immute operations such as .clone produce more maintainable code by preventing unexpected mutations
   *   - these immute operations provide a safe pit of success for common operations
   */
  as<
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >(
    props: Ref<TDobj, TShape, TPrimary, TUnique>,
  ): Ref<TDobj, TShape, TPrimary, TUnique>;
} = RefBase as never;

// overwrite the constructor name to 'Ref', to keep things consistent
Object.defineProperty(RefBase, 'name', {
  value: 'Ref',
  writable: false,
});
