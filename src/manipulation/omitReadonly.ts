import { UnexpectedCodePathError } from 'helpful-errors';
import { omit } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '@src/constraints/assertDomainObjectIsSafeToManipulate';
import type { DomainObject } from '@src/instantiation/DomainObject';
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';

import { getReadonlyKeys } from './getReadonlyKeys';

/**
 * exposes a function which properly handles any value that can could have been defined for an object property
 * - if domain object, omits readonly values
 * - if array, recursively omits on each item in the array
 * - if neither of the above, then its the terminal condition - return it, its fully omitted
 */
const recursivelyOmitReadonlyFromObjectValue: any = (thisValue: any) => {
  // handle directly nested domain object
  if (isOfDomainObject(thisValue)) return omitReadonly(thisValue); // eslint-disable-line @typescript-eslint/no-use-before-define

  // handle an array of one level deep (doesn't handle Array of Array, for simplicity)
  if (Array.isArray(thisValue))
    return thisValue.map(recursivelyOmitReadonlyFromObjectValue); // run self on each item in the array, (i.e., recursively)

  // handle any other value type
  return thisValue;
};

/**
 * omits all readonly values on a domain object
 *
 * relevance:
 * - often when submitting user-settable values, readonly values should be omitted
 * - this provides an easy way to omit both metadata and explicit readonly properties
 *
 * features:
 * - utilizes the `.metadata` property to identify metadata keys (applicable to all domain objects)
 * - utilizes the `.readonly` property to identify explicit readonly keys (applicable to DomainEntity only)
 * - recursive, applies omission deeply
 *
 * note:
 * - both metadata and readonly are set by the persistence layer
 * - metadata is a special subset of readonly: describes the persistence of the object (not the object itself)
 * - readonly (non-metadata) describes intrinsic attributes of the object that the persistence layer sets
 * - readonly (non-metadata) only applies to DomainEntity, due to their nature
 * - for DomainEvent and DomainLiteral, this function behaves identically to omitMetadata
 */
export const omitReadonly = <T extends DomainObject<Record<string, any>>>(
  obj: T,
): T => {
  // handle arrays
  if (Array.isArray(obj)) return recursivelyOmitReadonlyFromObjectValue(obj);

  // make sure its an instance of DomainObject
  if (!isOfDomainObject(obj))
    throw new UnexpectedCodePathError(
      'omitReadonly called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
      { obj },
    );

  // get the readonly keys (union of metadata and explicit readonly)
  const Constructor = obj.constructor as any as { new (...args: any): T }; // https://stackoverflow.com/a/61444747/3068233
  const readonlyKeys = getReadonlyKeys(obj, {
    nameOfFunctionNeededFor: 'omitReadonly',
  });

  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(obj);

  // object with omit applied recursively on each property
  const objectWithEachDomainObjectKeyRecursivelyOmitted: typeof obj =
    Object.entries(obj).reduce(
      (summary, [thisKey, thisValue]) => {
        return {
          ...summary,
          [thisKey]: recursivelyOmitReadonlyFromObjectValue(thisValue),
        };
      },
      {} as typeof obj,
    );

  // omit all of the readonly keys
  const objWithoutReadonlyValues = omit(
    objectWithEachDomainObjectKeyRecursivelyOmitted,
    readonlyKeys as never,
  );

  // return the instantiated object
  return new Constructor(objWithoutReadonlyValues);
};
