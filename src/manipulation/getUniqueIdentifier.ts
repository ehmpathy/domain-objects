import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { pick } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { isOfDomainEntity } from '../instantiation/inherit/isOfDomainEntity';
import { isOfDomainEvent } from '../instantiation/inherit/isOfDomainEvent';
import { isOfDomainLiteral } from '../instantiation/inherit/isOfDomainLiteral';
import { isOfDomainObject } from '../instantiation/inherit/isOfDomainObject';
import { refByUnique } from '../reference/refByUnique';
import { DomainEntityUniqueKeysMustBeDefinedError } from './DomainEntityUniqueKeysMustBeDefinedError';

/**
 * Extracts an object that identifies the domain object via unique key, for DomainEntity, DomainEvent, or DomainLiteral.
 *
 * Uses the definition of a DomainEntity, DomainEvent, or DomainLiteral in order to extract the properties that uniquely define the domain object, generically.
 */
export const getUniqueIdentifier = <T extends Record<string, any>>(
  obj: DomainEntity<T> | DomainEvent<T> | DomainLiteral<T>,
): Partial<T> => {
  // make sure its an instance of DomainObject
  if (!isOfDomainObject(obj))
    throw new BadRequestError(
      'getUniqueIdentifier called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
      {
        obj,
      },
    );

  // handle DomainEntity
  if (isOfDomainEntity(obj) || isOfDomainEvent(obj)) {
    const className = (obj.constructor as typeof DomainEntity).name;
    const uniqueKeys = (obj.constructor as typeof DomainEntity).unique;
    if (!uniqueKeys)
      throw new DomainEntityUniqueKeysMustBeDefinedError({
        entityName: className,
        nameOfFunctionNeededFor: 'getUniqueIdentifier',
      });

    // make sure that the unique keys are safe to manipulate
    assertDomainObjectIsSafeToManipulate(obj, {
      onKeys: uniqueKeys.flat(),
    });

    // use refByUnique to extract the unique identifier
    return refByUnique(obj as any) as Partial<T>;
  }

  // handle DomainLiteral
  if (isOfDomainLiteral(obj)) {
    const ignoreList = (obj.constructor as typeof DomainLiteral).metadata ?? [
      'id',
      'uuid',
    ]; // these are keys we should ignore, because literals are unique on their natural keys - not metadata keys (e.g., id or uuid)
    const uniqueKeys = Object.keys(obj).filter(
      (key) => !ignoreList.includes(key),
    ); // literals are unique on all keys, other than the metadata ones we ignore
    return pick(obj, uniqueKeys as never);
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
