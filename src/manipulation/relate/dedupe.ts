import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainObject } from '../../instantiation/DomainObject';
import { isOfDomainEntity } from '../../instantiation/inherit/isOfDomainEntity';
import { isOfDomainObject } from '../../instantiation/inherit/isOfDomainObject';
import { getUniqueIdentifier } from '../getUniqueIdentifier';
import { omitMetadataValues } from '../omitMetadataValues';
import { serialize } from '../serde/serialize';

// define how to get the dedupe identity key for any object
const toDedupeIdentity = <T>(obj: T) =>
  serialize(
    isOfDomainObject(obj) ? getUniqueIdentifier(obj as DomainObject<any>) : obj,
  );

const toVersionIdentity = <T>(obj: T) =>
  isOfDomainEntity(obj)
    ? serialize(omitMetadataValues(obj as DomainEntity<any>))
    : undefined; // if not an entity, there is no version identity

/**
 * a method which deduplicates objects by their identity from within an array
 *
 * note
 * - when it operates on dobj instances, it extracts their identity via getUniqueIdentifier
 * - when it operates on anything else, it simply serializes the object
 */
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
): T[] => {
  // track the objects we have seen
  const objsSeenMetadata: Record<string, { seen: true; version?: string }> = {};

  // track the ordered, deduped objs array, which we will build
  const objsDedupedList: T[] = [];

  // define how to check whether an obj has been seen already
  const getObjSeenMetadata = (
    obj: T,
  ): { seen: true; version?: string } | null =>
    objsSeenMetadata[toDedupeIdentity(obj)] ?? null;

  // define how to add a new distinct item
  const addNewDistinctObj = (obj: T): void => {
    // add to the objs seen lookup table
    objsSeenMetadata[toDedupeIdentity(obj)] = {
      seen: true,
      version: toVersionIdentity(obj),
    };

    // add to the objs deduped list
    objsDedupedList.push(obj);
  };

  // iterate through each object and add it to the deduped list as needed
  objs.forEach((thisObj) => {
    // determine if its been seen before
    const prevSeenMetadata = getObjSeenMetadata(thisObj);
    const hasBeenPrevSeen = prevSeenMetadata !== null;

    // if it has been seen, is an entity, and the caller didn't ask to CHOOSE_FIRST_OCCURRENCE, then check whether we should fail fast
    if (
      hasBeenPrevSeen &&
      isOfDomainEntity(thisObj) &&
      options?.onMultipleEntityVersions !== 'CHOOSE_FIRST_OCCURRENCE'
    ) {
      const versionPrevSeen = prevSeenMetadata.version;
      if (!versionPrevSeen)
        throw new UnexpectedCodePathError(
          'should have had prev seen metadata declared for a domain entity',
          { thisObj },
        );
      const versionCurrSeen = toVersionIdentity(thisObj);
      if (versionCurrSeen !== versionPrevSeen)
        throw new BadRequestError(
          `Two different versions of the same entity were asked to be deduped. Options.onMultipleEntityVersions !== 'CHOOSE_FIRST_OCCURRENCE', so we're failing fast here, since we don't know which version should be kept.`,
          {
            thisObj,
            versionCurrSeen,
            versionPrevSeen,
          },
        );
    }

    // if it's been previously seen otherwise, then we can exit here as its a dupe
    if (hasBeenPrevSeen) return;

    // otherwise, since its not been previously seen, add it as a new distinct obj
    addNewDistinctObj(thisObj);
  });

  // return all the distinct objs
  return objsDedupedList;
};
