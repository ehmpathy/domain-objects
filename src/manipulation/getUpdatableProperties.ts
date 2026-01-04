import { UnexpectedCodePathError } from 'helpful-errors';
import { pick } from 'type-fns';

import { assertDomainObjectIsSafeToManipulate } from '@src/constraints/assertDomainObjectIsSafeToManipulate';
import type { DomainEntity } from '@src/instantiation/DomainEntity';
import { isOfDomainEntity } from '@src/instantiation/inherit/isOfDomainEntity';
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';

import { DomainEntityUpdatablePropertiesMustBeDefinedError } from './DomainEntityUpdatablePropertiesMustBeDefinedError';

/**
 * Extracts an object that contains only the updatable properties of the domain object, for DomainEntity
 *
 * Uses the definition of a DomainEntity in order to extract the properties that are updatable for the domain object generically
 *
 * note
 * - this should not be called on DomainLiterals or DomainEvents, since by definition they can not have updatable properties
 */
export const getUpdatableProperties = <T extends Record<string, any>>(
  dobj: DomainEntity<T>,
): Partial<T> => {
  // make sure its an instance of DomainObject
  if (!isOfDomainObject(dobj))
    throw new Error(
      'getUpdatableProperties called on object that is not an instance of a DomainObject. Are you sure you instantiated the object? (Related: see `DomainObject.nested`)',
    );

  // make sure that its safe to manipulate
  assertDomainObjectIsSafeToManipulate(dobj);

  // handle DomainEntity
  if (isOfDomainEntity(dobj)) {
    const className = (dobj.constructor as typeof DomainEntity).name;
    const updatableProps = (dobj.constructor as typeof DomainEntity).updatable;
    if (!updatableProps)
      throw new DomainEntityUpdatablePropertiesMustBeDefinedError({
        entityName: className,
        nameOfFunctionNeededFor: 'getUpdatableProperties',
      });
    return pick(dobj, updatableProps.flat() as never);
  }

  // throw error we get here, this is unexpected
  throw new UnexpectedCodePathError(
    'unexpected domain object type for getUpdatableProperties. expected DomainEntity',
    {
      dobjClass: (dobj as any)?.constructor?.name,
      dobj,
    },
  );
};
