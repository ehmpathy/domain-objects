import { Schema as JoiSchema } from 'joi';

import { JoiValidationError } from './JoiValidationError';

export const validate = ({ domainObjectName, schema, props }: { domainObjectName: string; schema: JoiSchema; props: any }) => {
  const result = schema.validate(props);
  if (result.error) throw new JoiValidationError({ domainObject: domainObjectName, error: result.error, props });
};
