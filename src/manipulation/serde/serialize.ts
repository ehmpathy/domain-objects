/* eslint-disable @typescript-eslint/no-use-before-define */

/* eslint-disable no-underscore-dangle */
import { assertDomainObjectIsSafeToManipulate } from '../../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainLiteral } from '../../instantiation/DomainLiteral';
import { DomainObject } from '../../instantiation/DomainObject';
import { isOfDomainEntity } from '../../instantiation/inherit/isOfDomainEntity';
import { isOfDomainLiteral } from '../../instantiation/inherit/isOfDomainLiteral';
import { isOfDomainObject } from '../../instantiation/inherit/isOfDomainObject';
import { getUniqueIdentifier } from '../getUniqueIdentifier';

interface SerializeOptions {
  /**
   * set this to true if you need to deserialize the domain objects losslessly
   *
   * note
   * - this will make it so we do not call `getUniqueIdentifier` on the nested domain objects
   * - by default, this is set to false, so that this can be used for change detection
   */
  lossless?: boolean;

  /**
   * set this to true if the order of items in arrays does not matter in your usecase
   *
   * note
   * - this will make it so that the original order of items in arrays is not preserved
   * - by default, this is set to false, since order matters in arrays by common definition
   */
  orderless?: boolean;
}

/**
 * Returns a deterministic, human readable, and de-serializable string representation of a Domain Object.
 *
 * Deterministic:
 * - orders object keys
 * - sorts elements in arrays
 * - when lossless=false, replaces nested domain objects with their minimal and static representation (i.e., calls `getUniqueIdentifier` on any nested domain objects)
 *
 * Use Cases:
 * - change detection
 *   - e.g., determine whether there has been a change to an entity or not, by serializing the previous and current versions, and comparing equality
 *   - i.e., `const areEqual = serialize(omitMetadataValues(userBefore)) === serialize(omitMetadataValues(userNow));`
 *
 * - identity comparison
 *   - e.g., determine whether two domain objects are the same, by getting their unique identities, serializing each and comparing equality
 *   - i.e., `const areEqual = serialize(getUniqueIdentity(contactMethod1)) === serialize(getUniqueIdentity(contactMethod2))`
 *
 * - persistance
 *   - e.g., serialize domain objects into a persistant store in string format (to be later revived with the `deserialize` method)
 */
export const serialize = (
  value: any,
  options: SerializeOptions = { lossless: false, orderless: false },
): string => {
  // convert the value to a deterministically serializable object
  const serializableValue = toSerializable(value, options, true);

  // json stringify it last, so that we dont have a recursively growing set of nested quotes
  return JSON.stringify(serializableValue);
};

/**
 * helper method for serialize
 *
 * converts any value to a deterministically serializable representation (i.e., sorts arrays + object keys, casts .toString(), handles domain objects, etc)
 */
const toSerializable = (
  value: any,
  options: SerializeOptions,
  root?: boolean,
): any => {
  // if this value is not an array and is not an object, then it's a literal, so no more preparation required, return it itself
  if (!Array.isArray(value) && typeof value !== 'object') return value;

  // if its null, return it too (null is typeof 'object' in js :shrug:)
  if (value === null) return null;

  // if its an array, then `toSerializable` each element, and sort the result if needed
  if (Array.isArray(value))
    return value
      .map((el) => toSerializable(el, options))
      .sort((a, b) => {
        // if order was said to not matter, then sort in ascending value of their stringified form, to allow for deterministic comparisons
        if (options.orderless)
          return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;

        // otherwise, retain original order
        return 0;
      });

  // if it has a `.toString()` method, use the `.toString()` method; (e.g., new Date().toString())
  if (value.toString()) {
    const toStringResult = value.toString();
    if (toStringResult !== '[object Object]') return toStringResult; // use the result, unless its the "generic object -> ['object Object']" result, which isn't helpful
  }

  // otherwise, prepare to make the object stringifiable
  return toSerializableObject(value, options, root);
};

/**
 * helper method for `toSerializable`
 *
 * converts all objects to deterministically serializable objects (e.g., sort keys, handle domain objects, etc)
 */
const toSerializableObject = (
  obj: Record<string, any>,
  options: SerializeOptions,
  root?: boolean,
) => {
  const stringifiableObj: Record<string, any> = {};

  // if this object is a DomainObject, add its name to the serial parts as metadata (i.e., underscore suffix)
  if (isOfDomainObject(obj)) stringifiableObj._dobj = obj.constructor.name;

  // if this object is a domain object, make sure that it is safe to manipulate
  if (isOfDomainObject(obj)) assertDomainObjectIsSafeToManipulate(obj);

  // if this object is a persistable DomainObject AND its not the root object we're serializing && lossless is off, then only consider its unique properties for serialization; (i.e., only consider which domain objects the root object references, not the current state of the domain objects the root object references)
  let objToMakeSerializable = obj;
  if (
    !root &&
    !options.lossless &&
    (isOfDomainEntity(obj) || isOfDomainLiteral(obj))
  ) {
    objToMakeSerializable = getUniqueIdentifier(obj);
  }

  // for each key, in sorted order, get the serial representation
  Object.keys(objToMakeSerializable)
    .sort()
    .forEach((key) => {
      stringifiableObj[key] = toSerializable(obj[key], options);
    });

  // return it
  return stringifiableObj;
};
