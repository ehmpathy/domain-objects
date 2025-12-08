/* eslint-disable @typescript-eslint/no-redeclare */
import { BadRequestError } from 'helpful-errors';
import type { DomainObjectShape, Refable } from '../reference/Refable';
import type { RefKeysPrimary } from '../reference/RefKeysPrimary';
import { refByPrimary } from '../reference/refByPrimary';
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
 * - A `SeaTurtleRefByPrimary { uuid: string }` is a reference to a SeaTurtle by its primary key
 *
 * Note:
 * - Domain References are typically created automatically via `DomainEntity.RefByPrimary` or `DomainEntity.RefByPrimary`
 * - You rarely need to extend a DomainRef directly
 */
export type RefByPrimary<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types, when typescript supports constructor inference from instances
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Required<Pick<InstanceType<TDobj>, RefKeysPrimary<TDobj>[number]>>;

// extend the domain literal into a custom class, so that we can rename it into RefByUnique, without mutating the global DomainLiteral class
class RefByPrimaryBase<T extends DomainObjectShape> extends DomainLiteral<T> {
  public static metadata = [] as const;

  constructor(props: T) {
    // if props itself is a domain entity or domain event, extract its reference
    if (
      props &&
      typeof props === 'object' &&
      (isOfDomainEntity(props) || isOfDomainEvent(props))
    ) {
      super(refByPrimary(props as any) as T);
    } else {
      // validate that no primary key values are undefined at runtime
      if (props && typeof props === 'object') {
        for (const key of Object.keys(props)) {
          if ((props as Record<string, unknown>)[key] === undefined) {
            throw new BadRequestError(
              `RefByPrimary: primary key '${key}' is undefined; primary keys must have defined values at reference time.`,
              { props },
            );
          }
        }
      }
      super(props);
    }
  }
}

// create a constructor for RefByPrimary, so that we can instantiate references
// todo: actually use a class and extend DomainLiteral, when typescript supports more specialized types for classes; for now, we create a constructor via a procedure
export const RefByPrimary: {
  new <
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >(
    props: RefByPrimary<TDobj, TShape, TPrimary, TUnique>,
  ): RefByPrimary<TDobj, TShape, TPrimary, TUnique>;

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
    props: RefByPrimary<TDobj, TShape, TPrimary, TUnique>,
  ): RefByPrimary<TDobj, TShape, TPrimary, TUnique>;

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
    props: RefByPrimary<TDobj, TShape, TPrimary, TUnique>,
  ): RefByPrimary<TDobj, TShape, TPrimary, TUnique>;
} = RefByPrimaryBase as never;

// Set the constructor name to 'RefByPrimary' for better developer experience
Object.defineProperty(RefByPrimaryBase, 'name', {
  value: 'RefByPrimary',
  writable: false,
});
