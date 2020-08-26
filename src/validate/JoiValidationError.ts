import Joi from 'joi';

interface JoiValidationErrorDetail {
  message: string;
  path: string;
  type: string;
}
export class JoiValidationError extends Error {
  public details: JoiValidationErrorDetail[];

  public props: any;

  public domainObject: string;

  constructor({ error, props, domainObject }: { error: Joi.ValidationError; props: any; domainObject: string }) {
    const details = error.details.map((detail) => ({ message: detail.message, path: detail.path.join('.'), type: detail.type }));

    const message = `
Errors on ${Object.keys(details).length} properties were found while validating properties for domain object ${domainObject}.:
${JSON.stringify(details, null, 2)}

Props Provided:
${JSON.stringify(props, null, 2)}
    `.trim();
    super(message);

    this.details = details;
    this.props = props;
    this.domainObject = domainObject;
  }
}
