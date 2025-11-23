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
 *
 * @example
 * ```ts
 * const turtle = new SeaTurtle({ uuid: '1', seawaterSecurityNumber: '821', name: 'Crush' });
 * const ref = refByUnique<typeof SeaTurtle>(turtle);
 * // ref = { seawaterSecurityNumber: '821' }
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
    ref[key] = (instance as any)[key];
  }

  return ref as DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique>;
};
