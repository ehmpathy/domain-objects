// only importing types  > dev dep
import type { ZodError, ZodIssue } from 'zod';

import { HelpfulSchemaValidationError } from './HelpfulSchemaValidationError';

export class HelpfulZodValidationError extends HelpfulSchemaValidationError {
  public details: ZodIssue[];

  public props: any;

  public domainObject: string;

  constructor({
    error,
    props,
    domainObject,
  }: {
    error: ZodError;
    props: any;
    domainObject: string;
  }) {
    const message = `
Errors were found while validating properties for domain object ${domainObject}.:
${JSON.stringify(error.issues, null, 2)}

Props Provided:
${JSON.stringify(props, null, 2)}
    `.trim();
    super(message);

    this.details = error.issues;
    this.props = props;
    this.domainObject = domainObject;
  }
}
