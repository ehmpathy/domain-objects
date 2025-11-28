import {
  type AssessIsOfTypeMethod,
  type AssessWithAssure,
  withAssure,
} from 'type-fns';

import { type DomainEntity } from '../instantiation/DomainEntity';
import { type DomainObject } from '../instantiation/DomainObject';
import { isOfDomainEntity } from '../instantiation/inherit/isOfDomainEntity';
import { isOfDomainObject } from '../instantiation/inherit/isOfDomainObject';
import { DomainObjectMetadataMustBeDefinedError } from './DomainObjectMetadataMustBeDefinedError';
import { type ConstructorOf, type HasReadonly } from './HasReadonly.type';

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
      throw new Error(
        'hasReadonly called on object that is not an instance of a DomainObject. Are you sure you instantiated the object?',
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
      ? (dobj as unknown as typeof DomainEntity).readonly ?? []
      : [];

    // combine metadata and readonly keys
    const allReadonlyKeys = [...new Set([...metadataKeys, ...readonlyKeys])];

    // check that all readonly keys have defined values
    return allReadonlyKeys.every(
      (key) => (obj as Record<string, any>)[key] !== undefined,
    );
  };

  return withAssure(
    assess as AssessIsOfTypeMethod<InstanceType<TDobj>, HasReadonly<TDobj>>,
    { name: `hasReadonly({ of: ${dobj.name} })` },
  );
};
