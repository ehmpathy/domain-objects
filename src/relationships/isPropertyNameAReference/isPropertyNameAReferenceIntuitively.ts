import { getDomainObjectNameAfterDroppingSomeQualifiers } from './getDomainObjectNameAfterDroppingSomeQualifiers';
import { isPropertyNameAReferenceExplicitly } from './isPropertyNameAReferenceExplicitly';

/**
 * determines whether property name is an intuitive reference to a domain object
 *
 * for example:
 *  - `address: Address` => true
 *  - `homeAddress: Address` => true
 *  - `home: Address` => false 🚫
 *  - `engineerUuid: Engineer` => true
 *  - `leadEngineerUuid: Engineer` => true
 *  - `engineerUuids: Engineer` => true
 *  - `assignedEngineerUuids: Engineer` => true
 *  - `lead: Engineer` => false 🚫
 *  - `leadUuid: Engineer` => false 🚫
 *  - `assignedUuids: Engineer` => false 🚫
 *  - `leadEngineerUuid: LeadEngineer` => true
 *  - `headEngineerUuid: LeadEngineer` => true ✔️ // suffixes match -> intuitive, even though not explicit
 *  - `engineerUuid: LeadEngineer` => true ✔️ // suffixes match -> intuitive, even though not explicit
 */
export const isPropertyNameAReferenceIntuitively = ({
  propertyName,
  domainObjectName,
}: {
  propertyName: string;
  domainObjectName: string;
}) => {
  let qualifiersToDrop = 0;
  let iterationLimitExceeded = false;
  while (!iterationLimitExceeded) {
    // for this qualifiersToDrop count, define the name for the domain object after dropping those qualifiers
    const domainObjectNameMinusQualifiers =
      getDomainObjectNameAfterDroppingSomeQualifiers({
        domainObjectName,
        qualifiersToDrop,
      });

    // if dropping this qualifier produces no name, then its defo not a match, nothing else to try
    if (domainObjectNameMinusQualifiers === null) return false;

    // check if the domain object could now be referenced at this level of qualifiers
    const isExplicitReferenceNow = isPropertyNameAReferenceExplicitly({
      propertyName,
      domainObjectName: domainObjectNameMinusQualifiers,
    });

    // if its an explicit reference now, then its an intuitive reference
    if (isExplicitReferenceNow) return true;

    // otherwise, go another layer deeper and try again
    qualifiersToDrop += 1;

    // safety check: if we passed more than 20 qualifiers, there's been some sort of error
    if (qualifiersToDrop > 20) {
      iterationLimitExceeded = true; // this is redundant, but feels better than having a `while(true)` defined
      throw new Error(
        'attempted to drop more than 20 qualifiers. does someone really have 20 qualifiers on a name? this is probably a bug',
      );
    }
  }
  throw new Error('something unexpected went wrong'); // we shouldn't reach here
};
