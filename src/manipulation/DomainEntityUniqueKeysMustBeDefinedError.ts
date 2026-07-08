import { MalfunctionError } from 'helpful-errors';

// .why = an absent `static unique` is a developer misconfiguration of the class, not a caller's
//   bad input — so it is a MalfunctionError (exit 1, http 500), the system's fault to fix
export class DomainEntityUniqueKeysMustBeDefinedError extends MalfunctionError {
  constructor({
    entityName,
    nameOfFunctionNeededFor,
  }: {
    entityName: string;
    nameOfFunctionNeededFor: string;
  }) {
    const message = `
\`${entityName}.unique\` must be defined, to be able to \`${nameOfFunctionNeededFor}\`.

Example:
  \`\`\`
  interface RocketShip {
    serialNumber: string;
    fuelQuantity: number;
    passengers: number;
  }
  class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
    public static unique = ['serialNumber'];
  }
  \`\`\`
    `.trim();
    super(message);
  }
}
