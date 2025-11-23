import { UnexpectedCodePathError } from 'helpful-errors';

import { DomainObjectShape, Refable } from './DomainReferenceable';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';

/**
 * creates a reference to a domain object by its unique key
 *
 * extracts only the unique key properties from a domain object instance
 *
 * note
 * - you may need to explicitly annotate the type for proper inference
 *   - e.g., `const ref = refByUnique<typeof SeaTurtle>(turtle)`
 *   - automatic resolution of the relationship between instance and class.static properties is not yet possible in TypeScript
 * - recursively extracts references from nested domain objects
 *   - if a unique key property is itself a domain object, it will recursively call refByUnique on it
 *
 * @example
 * ```ts
 * const turtle = new SeaTurtle({ uuid: '1', seawaterSecurityNumber: '821', name: 'Crush' });
 * const ref = refByUnique<typeof SeaTurtle>(turtle);
 * // ref = { seawaterSecurityNumber: '821' }
 * ```
 *
 * @example
 * ```ts
 * // with nested domain objects
 * const turtle = new SeaTurtle({ seawaterSecurityNumber: '821', name: 'Crush' });
 * const shell = new SeaTurtleShell({ turtle, algea: 'ALIL' });
 * const ref = refByUnique<typeof SeaTurtleShell>(shell);
 * // ref = { turtle: { seawaterSecurityNumber: '821' } }
 * ```
 */
export const refByUnique = <
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
>(
  instance: InstanceType<TDobj>,
): DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique> => {
  // get the domain object constructor
  const DomainObjectConstructor = (instance as any).constructor;
  const uniqueKeys: readonly string[] = DomainObjectConstructor?.unique;
  if (!uniqueKeys)
    throw new UnexpectedCodePathError(
      'can not create refByUnique on a dobj which does not declare its .unique keys',
      { dobj: DomainObjectConstructor?.name, uniqueKeys },
    );

  // extract only the unique key properties from the instance
  const ref: Record<string, any> = {};
  for (const key of uniqueKeys) {
    const value = (instance as any)[key];

    // if the value is a nested domain object, recursively extract its reference
    if (value && typeof value === 'object' && value.constructor?.unique) {
      ref[key] = refByUnique(value);
    } else {
      ref[key] = value;
    }
  }

  return ref as DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique>;
};
