import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainObject } from '../../instantiation/DomainObject';
import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError';
import { getUniqueIdentifier } from '../getUniqueIdentifier';
import { omitMetadataValues } from '../omitMetadataValues';
import { serialize } from '../serde/serialize';

export const dedupe = <T>(
  objs: T[],
  options?: {
    /**
     * specifies what to do if more than one version of the same entity is found
     *
     * options
     * - FAIL_FAST = throw an UnexpectedCodePathError to fail fast and prevent accidental data loss
     * - CHOOSE_FIRST_OCCURRENCE = choose the first version of this entity found in the array
     *
     * note
     * - default = FAIL_FAST, to create a pit-of-success
     */
    onMultipleEntityVersions: 'FAIL_FAST' | 'CHOOSE_FIRST_OCCURRENCE';
  },
): T[] =>
  objs.filter((thisObj, thisIndex) => {
    // determine whether this is the first occurrence of this dobj in the array
    const indexOfFirstOccurrence = objs.findIndex(
      (otherObj) =>
        serialize(
          thisObj instanceof DomainObject
            ? getUniqueIdentifier(thisObj)
            : thisObj,
        ) ===
        serialize(
          otherObj instanceof DomainObject
            ? getUniqueIdentifier(otherObj)
            : otherObj,
        ),
    );
    const isFirstOccurrence = indexOfFirstOccurrence === thisIndex;

    // if this dobj is the first occurrence, then defo not a dupe
    if (isFirstOccurrence) return true;

    // if this dobj is not the first occurrence and it is an entity, then sanity check that there are no changes between the updatable attributes
    if (
      thisObj instanceof DomainEntity &&
      options?.onMultipleEntityVersions !== 'CHOOSE_FIRST_OCCURRENCE' // if they didn't explicitly ask to choose first occurrence, then check for versions
    ) {
      const firstOccurrence = objs[indexOfFirstOccurrence];
      const foundDifferentAttributes =
        serialize(
          firstOccurrence instanceof DomainObject
            ? omitMetadataValues(firstOccurrence)
            : firstOccurrence,
        ) !==
        serialize(
          thisObj instanceof DomainObject
            ? omitMetadataValues(thisObj)
            : thisObj,
        );
      if (foundDifferentAttributes)
        throw new UnexpectedCodePathError(
          `More than one version of the same entity found in the array. Can not safely dedupe, since we don't know which version should be kept.`,
          {
            firstOccurrence,
            nextOccurrence: thisObj,
          },
        );
    }

    // otherwise, this is a dupe, and should be removed
    return false;
  });
