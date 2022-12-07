import pick from 'lodash.pick';

import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainValueObject } from '../instantiation/DomainValueObject';
import { DomainObject } from '../instantiation/DomainObject';
import { assertDomainObjectIsSafeToManipulate } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntityUniqueKeysMustBeDefinedError } from './DomainEntityUniqueKeysMustBeDefinedError';

/**
 * Extracts an object that uniquely identifies the domain object, for DomainEntity and DomainValueObject.
 *
 * Uses the definition of a DomainEntity or DomainValueObject in order to extract the properties that uniquely define the domain object, generically.
 */
export const getUniqueIdentifier = <T extends Record<string, any>>(obj: DomainEntity<T> | DomainValueObject<T>): Partial<T> => {
  // make sure its an instance of DomainObject
  if (!(obj instanceof DomainObject))
    throw new Error(
      'getUniqueIdentifier called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
    );

  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(obj);

  // handle DomainEntity
  if (obj instanceof DomainEntity) {
    const className = (obj.constructor as typeof DomainEntity).name;
    const uniqueKeys = (obj.constructor as typeof DomainEntity).unique;
    if (!uniqueKeys) throw new DomainEntityUniqueKeysMustBeDefinedError({ entityName: className, nameOfFunctionNeededFor: 'getUniqueIdentifier' });
    return pick(obj, uniqueKeys.flat());
  }

  // handle DomainValueObject
  if (obj instanceof DomainValueObject) {
    const ignoreList = (obj.constructor as typeof DomainValueObject).metadata ?? ['id', 'uuid']; // these are keys we should ignore, because value objects are unique on their natural keys - not metadata keys (e.g., id or uuid)
    const uniqueKeys = Object.keys(obj).filter((key) => !ignoreList.includes(key)); // value objects are unique on all keys, other than the autogenerated ones we ignore
    return pick(obj, uniqueKeys);
  }

  // throw error we get here, this is unexpected
  throw new Error('unexpected domain object type');
};
