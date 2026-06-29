import { UnexpectedCodePathError } from 'helpful-errors';
import {
  type AssessIsOfTypeMethod,
  type AssessWithAssure,
  withAssure,
} from 'type-fns';

import type { DomainEntity } from '@src/instantiation/DomainEntity';
import type { DomainObject } from '@src/instantiation/DomainObject';
import { isOfDomainEntity } from '@src/instantiation/inherit/isOfDomainEntity';
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';

import { DomainObjectMetadataMustBeDefinedError } from './DomainObjectMetadataMustBeDefinedError';
import type { ConstructorOf, HasReadonly } from './HasReadonly.type';

/**
 * checks whether a (possibly nested, dot-path) readonly key resolves to a defined value
 *
 * - flat key (no dot) => the value on this object must be defined
 * - dot-path key => descend each segment; the terminal value must be defined
 * - array along the path => every element must satisfy the rest of the path
 */
const isReadonlyPathDefined = (value: any, path: string): boolean => {
  // array along the path => every element must satisfy the rest of the path
  if (Array.isArray(value))
    return value.every((item) => isReadonlyPathDefined(item, path));

  const dotIndex = path.indexOf('.');
  const head = dotIndex === -1 ? path : path.slice(0, dotIndex);
  const tail = dotIndex === -1 ? null : path.slice(dotIndex + 1);
  const next = value?.[head];

  // terminal segment => the value must be defined
  if (tail === null) return next !== undefined;

  // non-terminal segment => must be able to descend, then check the rest of the path
  if (next === undefined || next === null) return false;
  return isReadonlyPathDefined(next, tail);
};

/**
 * runtime type guard that asserts that all readonly keys (metadata + explicit readonly)
 * of a domain object have defined values
 *
 * note: this function requires that `metadata` is explicitly declared on the class.
 * if metadata is not explicitly declared, this function will throw an error to
 * prevent ambiguity about which keys are being checked.
 *
 * this is useful for narrowing types after persistence operations where readonly
 * attributes are expected to be populated
 *
 * for example:
 * ```ts
 * const cluster = new DeclaredAwsRdsCluster({ name: 'testdb' });
 * // cluster.arn is string | undefined
 * // cluster.port is number | undefined
 *
 * const persisted = await persist(cluster);
 * if (hasReadonly({ of: DeclaredAwsRdsCluster })(persisted)) {
 *   // persisted.arn is string (required)
 *   // persisted.port is number (required)
 * }
 *
 * // or use .assure to throw if readonly keys are missing
 * const assured = hasReadonly({ of: DeclaredAwsRdsCluster }).assure(persisted);
 * // assured.arn is string (required)
 * // assured.port is number (required)
 * ```
 */
export const hasReadonly = <TDobj extends ConstructorOf<DomainObject<any>>>({
  of: dobj,
}: {
  of: TDobj;
}): AssessWithAssure<InstanceType<TDobj>, HasReadonly<TDobj>> => {
  const assess = (obj: InstanceType<TDobj>): obj is HasReadonly<TDobj> => {
    // ensure it's a domain object
    if (!isOfDomainObject(obj))
      throw new UnexpectedCodePathError(
        'hasReadonly called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
        { obj },
      );

    // fail fast if metadata is not explicitly declared
    const metadataKeys = (dobj as unknown as typeof DomainObject).metadata as
      | string[]
      | undefined;
    if (!metadataKeys)
      throw new DomainObjectMetadataMustBeDefinedError({
        domainObjectName: dobj.name,
        nameOfFunctionNeededFor: 'hasReadonly',
      });

    // get explicit readonly keys (only applicable to DomainEntity)
    const readonlyKeys = isOfDomainEntity(obj)
      ? ((dobj as unknown as typeof DomainEntity).readonly ?? [])
      : [];

    // combine metadata and readonly keys
    const allReadonlyKeys = [...new Set([...metadataKeys, ...readonlyKeys])];

    // check that all readonly keys (flat or nested dot-path) have defined values
    return allReadonlyKeys.every((key) => isReadonlyPathDefined(obj, key));
  };

  return withAssure(
    assess as AssessIsOfTypeMethod<InstanceType<TDobj>, HasReadonly<TDobj>>,
    { name: `hasReadonly({ of: ${dobj.name} })` },
  );
};
