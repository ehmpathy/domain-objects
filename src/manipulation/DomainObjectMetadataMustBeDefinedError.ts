import { MalfunctionError } from 'helpful-errors';

// .why = an absent `static metadata` is a developer misconfiguration of the class, not a caller's
//   bad input — so it is a MalfunctionError (exit 1, http 500), the system's fault to fix
export class DomainObjectMetadataMustBeDefinedError extends MalfunctionError {
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
    `.trim();
    super(message, { domainObjectName, nameOfFunctionNeededFor });
  }
}
