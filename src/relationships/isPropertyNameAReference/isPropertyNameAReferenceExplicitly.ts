import { camelCase, pascalCase } from 'change-case';

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
 *  - `headEngineerUuid: LeadEngineer` => false 🚫 // close, but not fully qualified -> not explicit
 *  - `engineerUuid: LeadEngineer` => false  🚫 // close, but not fully qualified -> not explicit
 */
export const isPropertyNameAReferenceExplicitly = ({
  propertyName: propertyNamePotentiallyWithIrrelevantSuffixes,
  domainObjectName,
}: {
  propertyName: string;
  domainObjectName: string;
}): boolean => {
  // remove the potential `uuid` or `uuids` suffix of the property name (used in implicit uuid references)
  const propertyName = propertyNamePotentiallyWithIrrelevantSuffixes.replace(
    /Uuids?$/,
    '',
  );

  // check whether the property is exactly named after it
  const namedAfterItExactly = new RegExp(
    `${camelCase(domainObjectName)}s?$`,
  ).test(propertyName); // e.g., /leadEngineers?$/.test('leadEngineer');
  if (namedAfterItExactly) return true;

  // check whether the property is named after it as a suffix
  const namedAfterItAsASuffix = new RegExp(
    `${pascalCase(domainObjectName)}s?$`,
  ).test(propertyName); // e.g., /Engineers?$/.test('leadEngineer');
  if (namedAfterItAsASuffix) return true;

  // otherwise, false
  return false;
};
