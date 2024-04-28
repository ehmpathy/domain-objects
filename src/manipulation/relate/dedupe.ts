import { DomainObject } from '../../instantiation/DomainObject';
import { getUniqueIdentifier } from '../getUniqueIdentifier';
import { serialize } from '../serde/serialize';

export const dedupe = <T extends DomainObject<Record<string, any>>>(
  objs: T[],
): T[] =>
  objs.filter((thisObj, thisIndex) => {
    const indexOfFirstOccurrence = objs.findIndex(
      (otherObj) =>
        serialize(getUniqueIdentifier(thisObj)) ===
        serialize(getUniqueIdentifier(otherObj)),
    );
    return indexOfFirstOccurrence === thisIndex; // if this index is the same as its first index, then keep it; otherwise, its a dupe
  });
