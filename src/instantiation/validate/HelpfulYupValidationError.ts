import { ValidationError } from 'yup';

export class HelpfulYupValidationError extends Error {
  public details: string[];

  public props: any;

  public domainObject: string;

  constructor({ error, props, domainObject }: { error: ValidationError; props: any; domainObject: string }) {
    const message = `
Errors were found while validating properties for domain object ${domainObject}.:
${JSON.stringify(error.errors, null, 2)}

Props Provided:
${JSON.stringify(props, null, 2)}
    `.trim();
    super(message);

    this.details = error.errors;
    this.props = props;
    this.domainObject = domainObject;
  }
}
