import { UnexpectedCodePathError } from 'helpful-errors';
import { omit } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '@src/constraints/assertDomainObjectIsSafeToManipulate';
import type { DomainObject } from '@src/instantiation/DomainObject';
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';

import { getReadonlyKeys } from './getReadonlyKeys';

/**
 * splits a set of readonly keys into
 * - direct: keys to drop on this object (no dot in the key)
 * - nested: dot-path groups keyed by their head segment, with the rest of the path as the value
 *
 * for example,
 * - input  = ['host', 'network.interface.privateIp', 'network.subnet']
 * - direct = ['host']
 * - nested = { network: ['interface.privateIp', 'subnet'] }
 */
const splitReadonlyPaths = (
  keys: string[],
): { direct: string[]; nested: Record<string, string[]> } =>
  keys.reduce<{ direct: string[]; nested: Record<string, string[]> }>(
    (summary, key) => {
      const dotIndex = key.indexOf('.');

      // no dot => direct readonly key on this object
      if (dotIndex === -1)
        return { ...summary, direct: [...summary.direct, key] };

      // dot => nested path; group by head segment, keep the rest (tail) of the path
      const head = key.slice(0, dotIndex);
      const tail = key.slice(dotIndex + 1);
      return {
        ...summary,
        nested: {
          ...summary.nested,
          [head]: [...(summary.nested[head] ?? []), tail],
        },
      };
    },
    { direct: [], nested: {} },
  );

/**
 * applies readonly omission to a single property value
 * - domain object => recurse, and thread any nested readonly paths declared for this value
 * - array => recurse on each item (nested readonly applies to every element, per the dot-path contract)
 * - otherwise => terminal value; if a nested path was expected to descend further, fail-fast (unless the value is absent)
 */
const recursivelyOmitReadonlyFromObjectValue = (
  thisValue: any,
  nestedPaths: string[],
): any => {
  // handle a directly nested domain object
  if (isOfDomainObject(thisValue))
    return omitReadonlyDeep(thisValue, nestedPaths); // eslint-disable-line @typescript-eslint/no-use-before-define

  // handle an array (one level deep); nested readonly applies to every element
  if (Array.isArray(thisValue))
    return thisValue.map((item) =>
      recursivelyOmitReadonlyFromObjectValue(item, nestedPaths),
    );

  // no further nested paths => no nested keys to omit, return it
  if (nestedPaths.length === 0) return thisValue;

  // a nested path expects to descend further, but the value is null => legitimate absent subtree, return it
  if (thisValue === null) return thisValue;

  // a nested path expects to descend further, but the value is absent or not a domain object => misconfiguration, fail-fast
  // (a nested readonly path must traverse declared `static nested` domain objects so the path can be followed)
  throw new UnexpectedCodePathError(
    'omitReadonly: a nested readonly path expected a domain object to descend into, but the value is absent or not a domain object. to fix: declare each sub-object on the path in `static nested` (and ensure it is present), e.g. `public static nested = { network: AwsNetwork }`. see the "Nested Readonly Properties" section of the readme for the full pattern.',
    { thisValue, nestedPaths },
  );
};

/**
 * omits readonly values from a domain object instance, and passes any inherited nested readonly paths down
 */
const omitReadonlyDeep = <T extends DomainObject<Record<string, any>>>(
  obj: T,
  nestedPathsInherited: string[],
): T => {
  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(obj);

  // combine this object's own readonly keys (metadata + explicit readonly, incl. its own dot-paths) with any inherited nested paths
  const ownReadonlyKeys = getReadonlyKeys(obj, {
    nameOfFunctionNeededFor: 'omitReadonly',
  });
  const { direct, nested } = splitReadonlyPaths([
    ...ownReadonlyKeys,
    ...nestedPathsInherited,
  ]);

  // fail-fast if a nested readonly path references a property that is not present on this object (misconfigured path)
  const headsUnmatched = Object.keys(nested).filter(
    (head) => !Object.keys(obj).includes(head),
  );
  if (headsUnmatched.length)
    throw new UnexpectedCodePathError(
      'omitReadonly: a nested readonly path references a property that is not present on the object. check the dot-path against the object shape and `static nested`.',
      { headsUnmatched, objectKeys: Object.keys(obj), nestedPaths: nested },
    );

  // recurse each property, and pass down any nested readonly paths that apply to that key
  const objectWithEachValueRecursed: typeof obj = Object.entries(obj).reduce(
    (summary, [thisKey, thisValue]) => ({
      ...summary,
      [thisKey]: recursivelyOmitReadonlyFromObjectValue(
        thisValue,
        nested[thisKey] ?? [],
      ),
    }),
    {} as typeof obj,
  );

  // drop all of the direct readonly keys
  const objWithoutReadonlyValues = omit(
    objectWithEachValueRecursed,
    direct as never,
  );

  // reconstruct the instantiated object
  const Constructor = obj.constructor as any as { new (...args: any): T }; // https://stackoverflow.com/a/61444747/3068233
  return new Constructor(objWithoutReadonlyValues);
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
 * - supports nested readonly via dot-path keys (e.g. `'network.interface.privateIp'`), declared from the entity grain
 * - recursive, applies omission deeply
 *
 * note:
 * - both metadata and readonly are set by the persistence layer
 * - metadata is a special subset of readonly: describes the persistence of the object (not the object itself)
 * - readonly (non-metadata) describes intrinsic attributes of the object that the persistence layer sets
 * - readonly (non-metadata) only applies to DomainEntity, due to their nature
 * - a nested readonly key uses dot-path notation and is declared on the entity (the literal it points into is stateless and reusable, so it cannot self-declare readonly)
 * - a nested readonly path applies to every element when it traverses an array of nested objects
 * - for DomainEvent and DomainLiteral, this function behaves identically to omitMetadata
 */
export const omitReadonly = <T extends DomainObject<Record<string, any>>>(
  obj: T,
): T => {
  // handle arrays
  if (Array.isArray(obj))
    return recursivelyOmitReadonlyFromObjectValue(obj, []);

  // make sure its an instance of DomainObject
  if (!isOfDomainObject(obj))
    throw new UnexpectedCodePathError(
      'omitReadonly called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
      { obj },
    );

  // omit readonly values, and pass nested readonly paths through the recursion
  return omitReadonlyDeep(obj, []);
};
