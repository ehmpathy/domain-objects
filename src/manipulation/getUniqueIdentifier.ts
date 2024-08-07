import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { pick } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { DomainObject } from '../instantiation/DomainObject';
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
  if (!(obj instanceof DomainObject))
    throw new Error(
      'getUniqueIdentifier called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
    );

  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(obj);

  // handle DomainEntity
  if (obj instanceof DomainEntity || obj instanceof DomainEvent) {
    const className = (obj.constructor as typeof DomainEntity).name;
    const uniqueKeys = (obj.constructor as typeof DomainEntity).unique;
    if (!uniqueKeys)
      throw new DomainEntityUniqueKeysMustBeDefinedError({
        entityName: className,
        nameOfFunctionNeededFor: 'getUniqueIdentifier',
      });
    return pick(obj, uniqueKeys.flat() as never);
  }

  // handle DomainLiteral
  if (obj instanceof DomainLiteral) {
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
