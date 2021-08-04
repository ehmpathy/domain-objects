/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-underscore-dangle */
import { assertDomainObjectIsSafeToManipulate } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainObject } from '../instantiation/DomainObject';
import { DomainValueObject } from '../instantiation/DomainValueObject';
import { getUniqueIdentifier } from './getUniqueIdentifier';

/**
 * Returns a deterministic, human readable, and de-serializable string representation of a Domain Object.
 *
 * Deterministic:
 * - orders object keys
 * - sorts elements in arrays
 * - replaces nested domain objects with their minimal and static representation (i.e., calls `getUniqueIdentifier` on any key's value w/ instance of DomainEntity | DomainValueObject)
 *
 * Use Cases:
 * - change detection
 *   - e.g., determine whether there has been a change to an entity or not, by serializing the previous and current versions, and comparing equality
 *   - i.e., `const areEqual = serialize(userBefore) === serialize(userNow);`
 *
 * - identity comparison
 *   - e.g., determine whether two domain objects are the same, by getting their unique identities, serializing each and comparing equality
 *   - i.e., `const areEqual = serialize(getUniqueIdentity(contactMethod1)) === serialize(getUniqueIdentity(contactMethod2))`
 */
export const serialize = (value: any): string => {
  // 1. convert the value to a deterministically serializable object
  const serializableValue = toSerializable(value, true);

  // 2. json stringify it last, so that we dont have a recursively growing set of nested quotes
  return JSON.stringify(serializableValue);
};

/**
 * helper method for serialize
 *
 * converts any value to a deterministically serializable representation (i.e., sorts arrays + object keys, casts .toString(), handles domain objects, etc)
 */
export const toSerializable = (value: any, root?: boolean): any => {
  // if this value is not an array and has a `.toString` definition, return it itself
  if (!Array.isArray(value) && typeof value !== 'object') return value;

  // if its null, return it too (null is typeof 'object' in js :shrug:)
  if (value === null) return null;

  // if its an array, then `toSerializable` each element, and sort the result
  if (Array.isArray(value)) return value.map((el) => toSerializable(el)).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)); // stringify to sort, to sort objects correctly

  // if it has a `.toString()` method, use the `.toString()` method; (e.g., new Date().toString())
  if (value.toString()) {
    const toStringResult = value.toString();
    if (toStringResult !== '[object Object]') return toStringResult; // use the result, unless its the "generic object -> ['object Object']" result, which isn't helpful
  }

  // otherwise, prepare to make the object stringifiable
  return toSerializableObject(value, root);
};

/**
 * helper method for `toSerializable`
 *
 * converts all objects to deterministically serializable objects (e.g., sort keys, handle domain objects, etc)
 */
const toSerializableObject = (obj: Record<string, any>, root?: boolean) => {
  const stringifiableObj: Record<string, any> = {};

  // if this object is a DomainObject, add its name to the serial parts as metadata (i.e., underscore suffix)
  if (obj instanceof DomainObject) stringifiableObj._dobj = obj.constructor.name;

  // if this object is a domain object, make sure that it is safe to manipulate
  if (obj instanceof DomainObject) assertDomainObjectIsSafeToManipulate(obj);

  // if this object is a persistable DomainObject AND its not the root object we're serializing, then only consider its unique properties for serialization; (i.e., only consider which domain objects the root object references, not the current state of the domain objects the root object references)
  let objToMakeSerializable = obj;
  if (!root && (obj instanceof DomainEntity || obj instanceof DomainValueObject)) {
    objToMakeSerializable = getUniqueIdentifier(obj);
  }

  // for each key, in sorted order, get the serial representation
  Object.keys(objToMakeSerializable)
    .sort()
    .forEach((key) => {
      stringifiableObj[key] = toSerializable(obj[key]);
    });

  // return it
  return stringifiableObj;
};
