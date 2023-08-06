export class DomainEntityUpdatablePropertiesMustBeDefinedError extends Error {
  constructor({
    entityName,
    nameOfFunctionNeededFor,
  }: {
    entityName: string;
    nameOfFunctionNeededFor: string;
  }) {
    const message = `
\`${entityName}.updatable\` must be defined, to be able to \`${nameOfFunctionNeededFor}\`.

Example:
  \`\`\`
  interface RocketShip {
    serialNumber: string;
    fuelQuantity: number;
    passengers: number;
  }
  class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
    public static updatable = ['fuelQuantity', 'passengers];
  }
  \`\`\`
    `;
    super(message);
  }
}
