export class DomainEntityPrimaryKeysMustBeDefinedError extends Error {
  constructor({
    entityName,
    nameOfFunctionNeededFor,
  }: {
    entityName: string;
    nameOfFunctionNeededFor: string;
  }) {
    const message = `
\`${entityName}.primary\` must be defined, to be able to \`${nameOfFunctionNeededFor}\`.

Example:
  \`\`\`
  interface RocketShip {
    uuid?: string;
    serialNumber: string;
    fuelQuantity: number;
    passengers: number;
  }
  class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
    public static primary = ['uuid'];
  }
  \`\`\`
    `;
    super(message);
  }
}
