import { sha256 } from 'cross-sha256';

import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainValueObject } from '../instantiation/DomainValueObject';
import { getUniqueIdentifier } from './getUniqueIdentifier';

/**
 * get a uri safe slug which uniquely identifies this domain object
 *
 * features
 * - human scannable, for easy debugging
 * - file path and uri safe, for broad usage
 *
 * usecases
 * - persisting domain entities to the cache
 *
 * strategy
 * - define the human readable portion of the slug by concatenating the unique identifier values and omitting non-safe characters (safe = `\w`, `.`, `-`, `_`)
 * - define the identity uniqueness guarantee by using sha256 to guarantee that the total string will no have collisions due to excluding non-safe characters
 */
export const getUniqueIdentifierSlug = (
  dobj: DomainEntity<any> | DomainValueObject<any>,
): string => {
  const identifier = getUniqueIdentifier(dobj);

  // define the human scanable part so users can debug more easily
  const humanPart = `${dobj.constructor.name}.${Object.entries(identifier)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1)) // sort by key name
    .map((val) => JSON.stringify(val[1]))
    .join('.')}`
    .replace(/[^\w\-\_\.]/g, '') // strip non-safe characters
    .slice(0, 321); // limit the characters

  // define the uniqueness guarantee part, to ensure that there's no collisions in uniqueness due to removing non-safe characters
  const uniquePart = new sha256()
    .update(JSON.stringify(identifier))
    .digest('hex');

  // return the combination
  return [humanPart, uniquePart].join('.');
};
