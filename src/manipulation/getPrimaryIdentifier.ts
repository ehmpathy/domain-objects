import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { pick } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '../constraints/assertDomainObjectIsSafeToManipulate';
import type { DomainEntity } from '../instantiation/DomainEntity';
import type { DomainEvent } from '../instantiation/DomainEvent';
import type { DomainLiteral } from '../instantiation/DomainLiteral';
import { isOfDomainEntity } from '../instantiation/inherit/isOfDomainEntity';
import { isOfDomainEvent } from '../instantiation/inherit/isOfDomainEvent';
import { isOfDomainLiteral } from '../instantiation/inherit/isOfDomainLiteral';
import { isOfDomainObject } from '../instantiation/inherit/isOfDomainObject';
import { DomainEntityPrimaryKeysMustBeDefinedError } from './DomainEntityPrimaryKeysMustBeDefinedError';

/**
 * Extracts an object that identifies the domain object via primary key, for DomainEntity, DomainEvent, or DomainLiteral.
 *
 * Uses the definition of a DomainEntity, DomainEvent, or DomainLiteral in order to extract the primary key of the dobj, generically.
 */
export const getPrimaryIdentifier = <T extends Record<string, any>>(
  obj: DomainEntity<T> | DomainEvent<T> | DomainLiteral<T>,
): Partial<T> | undefined => {
  // make sure its an instance of DomainObject
  if (!isOfDomainObject(obj))
    throw new BadRequestError(
      'getUniqueIdentifier called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
      { obj },
    );

  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(obj);

  // handle DomainEntity, DomainEvent, and DomainLiteral
  if (isOfDomainEntity(obj) || isOfDomainEvent(obj) || isOfDomainLiteral(obj)) {
    const className = (obj.constructor as typeof DomainEntity).name;
    const primaryKeys = (obj.constructor as typeof DomainEntity).primary;
    if (!primaryKeys)
      throw new DomainEntityPrimaryKeysMustBeDefinedError({
        entityName: className,
        nameOfFunctionNeededFor: 'getPrimaryIdentifier',
      });
    const primary = pick(obj, primaryKeys.flat() as never);
    return Object.keys(primary).length ? primary : undefined; // if no primary found in instance -> undefined
  }

  // throw error we get here, this is unexpected
  throw new UnexpectedCodePathError(
    'unexpected domain object type for getUniqueIdentifier. expected DomainLiteral, DomainEntity, or DomainEvent',
    {
      dobjClass: (obj as any)?.constructor?.name,
      dobj: obj,
    },
  );
};
