import { type DomainEntity } from '../instantiation/DomainEntity';
import { type DomainObject } from '../instantiation/DomainObject';
import { isOfDomainEntity } from '../instantiation/inherit/isOfDomainEntity';
import { isOfDomainObject } from '../instantiation/inherit/isOfDomainObject';
import { getMetadataKeys } from './getMetadataKeys';

/**
 * returns the readonly keys defined on the class of the domain object
 *
 * note,
 * - this function returns the union of metadata keys and explicit readonly keys
 * - only domain entities support non-metadata readonly attributes, due to their nature
 */
export const getReadonlyKeys = (
  obj: DomainObject<any>,
  options?: { nameOfFunctionNeededFor?: string },
): string[] => {
  // make sure its an instance of DomainObject
  if (!isOfDomainObject(obj))
    throw new Error(
      'getReadonlyKeys called on object that is not an instance of a DomainObject. Are you sure you instantiated the object?',
    );

  // metadata is always readonly (applicable to all domain objects)
  const metadataKeys = getMetadataKeys(obj, options);

  // for DomainEntity, include both metadata and explicit readonly keys
  // (readonly = intrinsic attributes set by persistence layer, e.g., AWS-resolved host/port/status)
  if (isOfDomainEntity(obj)) {
    const domainObjectConstructor = obj.constructor as typeof DomainEntity;
    const explicitReadonlyKeys = (domainObjectConstructor.readonly ??
      []) as string[];
    // combine and dedupe
    return [...new Set([...metadataKeys, ...explicitReadonlyKeys])];
  }

  // for DomainEvent, DomainLiteral, and other domain objects: only metadata is readonly
  // - DomainEvent: immutable by nature, all properties known before persistence
  // - DomainLiteral: immutable by nature, fully defined by intrinsic properties
  return metadataKeys;
};
