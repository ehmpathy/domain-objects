import { HelpfulError } from 'helpful-errors';

export class DomainObjectMetadataMustBeDefinedError extends HelpfulError {
  constructor({
    domainObjectName,
    nameOfFunctionNeededFor,
  }: {
    domainObjectName: string;
    nameOfFunctionNeededFor: string;
  }) {
    const message = `
\`${domainObjectName}.metadata\` must be defined, to be able to \`${nameOfFunctionNeededFor}\`.

Without explicit metadata, it is ambiguous which keys should be checked.

Example:
  \`\`\`ts
  interface RocketShip {
    uuid?: string;
    serialNumber: string;
    fuelQuantity: number;
    passengers: number;
  }
  class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
    public static primary = ['uuid'] as const;
    public static unique = ['serialNumber'] as const;
    public static metadata = ['uuid'] as const;
  }
  \`\`\`
    `;
    super(message, { domainObjectName, nameOfFunctionNeededFor });
  }
}
