import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { hasDeclaredUniqueKey } from './hasDeclaredUniqueKey';
import type { DomainObjectShape, Refable } from './Refable';
import type { RefByUnique } from './RefByUnique.type';

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
): RefByUnique<TDobj, TShape, TPrimary, TUnique> => {
  // get the domain object constructor
  const DomainObjectConstructor = (instance as any).constructor;
  const uniqueKeys: readonly string[] = DomainObjectConstructor?.unique;
  // ⚠️ the gate is `hasDeclaredUniqueKey`, not a bare truthy read: `static unique = []` is TRUTHY,
  // so a bare `!uniqueKeys` let an empty declaration through, the loop below never ran, and this
  // returned `{}` — a reference that names no key, reported as a success (`rule.forbid.failhide`).
  // one predicate for the same fact everywhere it is read, so this walk and the schema walk in
  // `getContractRef` cannot disagree about what "declares a unique key" means.
  if (!hasDeclaredUniqueKey(DomainObjectConstructor))
    throw new UnexpectedCodePathError(
      'can not create refByUnique on a dobj which does not declare its .unique keys',
      { dobj: DomainObjectConstructor?.name, uniqueKeys },
    );

  // extract only the unique key properties from the instance
  const ref: Record<string, any> = {};
  for (const key of uniqueKeys) {
    const value = (instance as any)[key];

    // fail loud on an absent key — a reference names a real value, or it names none
    // (mirrors refByPrimary; the three surfaces that describe a unique ref must agree — see
    //  RefByUnique.type.ts and getContractRef's `pickDeclaredKeys`)
    if (value === undefined)
      throw new BadRequestError(
        `refByUnique: unique key '${key}' is undefined; unique keys must have defined values at reference time.`,
        { dobj: DomainObjectConstructor?.name, key },
      );

    // if the value is a nested domain object, recursively extract its reference
    // (gate shared with buildKeyContract via hasDeclaredUniqueKey — one source of truth)
    if (
      value &&
      typeof value === 'object' &&
      hasDeclaredUniqueKey(value.constructor)
    ) {
      ref[key] = refByUnique(value);
    } else {
      ref[key] = value;
    }
  }

  return ref as RefByUnique<TDobj, TShape, TPrimary, TUnique>;
};
