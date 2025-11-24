import { UnexpectedCodePathError } from 'helpful-errors';

import { RefByPrimary } from '../instantiation/RefByPrimary';
import { DomainObjectShape, Refable } from './Refable';

/**
 * creates a reference to a domain object by its primary key
 *
 * extracts only the primary key properties from a domain object instance
 *
 * note
 * - you may need to explicitly annotate the type for proper inference
 *   - e.g., `const ref = refByPrimary<typeof SeaTurtle>(turtle)`
 *   - automatic resolution of the relationship between instance and class.static properties is not yet possible in TypeScript
 *
 * @example
 * ```ts
 * const turtle = new SeaTurtle({ uuid: '1', seawaterSecurityNumber: '821', name: 'Crush' });
 * const ref = refByPrimary<typeof SeaTurtle>(turtle);
 * // ref = { uuid: '1' }
 * ```
 */
export const refByPrimary = <
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
>(
  instance: InstanceType<TDobj>,
): RefByPrimary<TDobj, TShape, TPrimary, TUnique> => {
  // get the domain object constructor
  const DomainObjectConstructor = (instance as any).constructor;
  const primaryKeys: readonly string[] = DomainObjectConstructor?.primary;
  if (!primaryKeys)
    throw new UnexpectedCodePathError(
      'can not create refByPrimary on a dobj which does not declare its .primary keys',
      { dobj: DomainObjectConstructor?.name, primaryKeys },
    );

  // extract only the primary key properties from the instance
  const ref: Record<string, any> = {};
  for (const key of primaryKeys) {
    ref[key] = (instance as any)[key];
  }

  return ref as RefByPrimary<TDobj, TShape, TPrimary, TUnique>;
};
