// only importing types  > dev dep
import type { ValidationError } from 'joi';

interface HelpfulJoiValidationErrorDetail {
  message: string;
  path: string;
  type: string;
}
export class HelpfulJoiValidationError extends Error {
  public details: HelpfulJoiValidationErrorDetail[];

  public props: any;

  public domainObject: string;

  constructor({
    error,
    props,
    domainObject,
  }: {
    error: ValidationError;
    props: any;
    domainObject: string;
  }) {
    const details = error.details.map((detail) => ({
      message: detail.message,
      path: detail.path.join('.'),
      type: detail.type,
    }));

    const message = `
Errors on ${
      Object.keys(details).length
    } properties were found while validating properties for domain object ${domainObject}.:
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
