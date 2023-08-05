import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainObject } from '../instantiation/DomainObject';
import { DomainEntityUniqueKeysMustBeDefinedError } from './DomainEntityUniqueKeysMustBeDefinedError';

const DEFAULT_METADATA_KEYS = [
  'id',
  'uuid',
  'createdAt',
  'updatedAt',
  'effectiveAt',
];

/**
 * returns the metadata keys defined on the class of the domain object
 */
export const getMetadataKeys = (
  obj: DomainObject<any>,
  options?: { nameOfFunctionNeededFor?: string },
): string[] => {
  // make sure its an instance of DomainObject
  if (!(obj instanceof DomainObject))
    throw new Error(
      'getMetadataKeys called on object that is not an instance of a DomainObject. Are you sure you instantiated the object?',
    );

  // see if metadata was explicitly defined
  const metadataKeysDeclared = (obj.constructor as typeof DomainObject)
    .metadata as string[];
  if (metadataKeysDeclared) return metadataKeysDeclared;

  // if it wasn't explicitly declared and its a DomainEntity or DomainEvent, then check to see if uuid is part of the unique key and augment default keys based on that
  if (obj instanceof DomainEntity || obj instanceof DomainEvent) {
    const className = (obj.constructor as typeof DomainEntity).name;
    const uniqueKeys = (obj.constructor as typeof DomainEntity).unique;
    if (!uniqueKeys)
      throw new DomainEntityUniqueKeysMustBeDefinedError({
        entityName: className,
        nameOfFunctionNeededFor:
          options?.nameOfFunctionNeededFor ?? 'getMetadataKeys',
      });
    if (uniqueKeys.flat().includes('uuid'))
      return DEFAULT_METADATA_KEYS.filter((key) => key !== 'uuid'); // if the unique key includes uuid, then uuid is not metadata
  }

  // otherwise, return the defaults
  return DEFAULT_METADATA_KEYS;
};
