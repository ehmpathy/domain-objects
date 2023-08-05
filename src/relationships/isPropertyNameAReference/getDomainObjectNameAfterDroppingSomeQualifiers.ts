import { noCase, pascalCase } from 'change-case';

/**
 * examples:
 * - HomeAddress, 1 => Address
 * - HomeAddress, 2 => null
 * - PlaceExternalId, 1 => ExternalId
 * - PlaceExternalId, 2 => null
 * - TrainStationDockingGate, 2 => DockingGate
 * - TrainStationDockingGate, 3 => Gate
 * - TrainStationDockingGate, 4 => null
 */
export const getDomainObjectNameAfterDroppingSomeQualifiers = ({
  domainObjectName,
  qualifiersToDrop,
}: {
  domainObjectName: string;
  qualifiersToDrop: number;
}): string | null => {
  // sanity check
  if (qualifiersToDrop < 0)
    throw new Error('qualifiers to drop must be greater than 0');

  // handle base case
  if (qualifiersToDrop === 0) return domainObjectName; // nothing to do in this case

  // drop the qualifiers
  const partsOfName = noCase(domainObjectName) // no case splits up string w/ spaces
    .split(' ');
  const nameWithoutRequestedQualifiers = pascalCase(
    partsOfName.slice(qualifiersToDrop).join(' '),
  );

  // check that its still a valid name
  if (nameWithoutRequestedQualifiers.length < 3) return null; // less than 3 char -> not a valid name

  // return the name without qualifiers
  return nameWithoutRequestedQualifiers;
};
