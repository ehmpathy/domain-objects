/* eslint-disable @typescript-eslint/no-redeclare */
import { type RefKeysUnique } from '../reference/RefKeysUnique';
import { type DomainObjectShape, type Refable } from '../reference/Refable';
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
 * - A `SeaTurtleRefByUnique { seawaterSecurityNumber: string }` is a reference to a SeaTurtle by its unique key
 *
 * Note:
 * - Domain References are typically created automatically via `DomainEntity.RefByUnique` or `DomainEntity.RefByPrimary`
 * - You rarely need to extend a DomainRef directly
 */
export type RefByUnique<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types, when typescript supports constructor inference from instances
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Pick<InstanceType<TDobj>, RefKeysUnique<TDobj>[number]>;

// extend the domain literal into a custom class, so that we can rename it into RefByUnique, without mutating the global DomainLiteral class
class RefByUniqueBase<T extends DomainObjectShape> extends DomainLiteral<T> {
  constructor(props: T) {
    // if props itself is a domain entity or domain event, extract its reference
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
        transformedProps[key] = RefByUnique.as(value); // todo: is it safe to assume its always unique keys nested within unique keys? find examples where its not?
      } else {
        transformedProps[key] = value;
      }
    }
    super(transformedProps as T);
  }
}

// create a constructor for RefByUnique, so that we can instantiate references
// todo: actually use a class and extend DomainLiteral, when typescript supports more specialized types for classes; for now, we create a constructor via a procedure
export const RefByUnique: {
  new <
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >(
    props: RefByUnique<TDobj, TShape, TPrimary, TUnique>,
  ): RefByUnique<TDobj, TShape, TPrimary, TUnique>;

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
    props: RefByUnique<TDobj, TShape, TPrimary, TUnique>,
  ): RefByUnique<TDobj, TShape, TPrimary, TUnique>;

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
    props: RefByUnique<TDobj, TShape, TPrimary, TUnique>,
  ): RefByUnique<TDobj, TShape, TPrimary, TUnique>;
} = RefByUniqueBase as never;

// overwrite the constructor name to 'RefByUnique', to keep things consistent
Object.defineProperty(RefByUniqueBase, 'name', {
  value: 'RefByUnique',
  writable: false,
});
