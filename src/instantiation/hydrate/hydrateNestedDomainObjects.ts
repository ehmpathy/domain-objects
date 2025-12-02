import { DomainObject } from '../DomainObject';
import { isOfDomainObject } from '../inherit/isOfDomainObject';

const isArray = <T>(val: T | Array<T>): val is Array<T> => Array.isArray(val);

export class NestedDomainObjectHydrationError extends Error {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(message: string, metadata: Record<string, any>) {
    super(
      `
${message}

${JSON.stringify(metadata, null, 2)}
    `.trim(),
    );
  }
}

export const hydrateNestedDomainObjects = ({
  props,
  nested,
  domainObjectName,
}: {
  props: Record<string, any>;
  nested: Record<string, typeof DomainObject | (typeof DomainObject)[]>;
  domainObjectName: string;
}): Record<string, any> => {
  // create a new object, so as to not mutate original props
  const hydratedProps: Record<string, any> = { ...props };

  // drop the "_dobj" prop, if one was defined due to serialization
  delete hydratedProps._dobj; // eslint-disable-line no-underscore-dangle

  // for each key that we were told is a nested domain object
  Object.keys(nested).forEach((key) => {
    // check that the value of "nested" was defined as a DomainObject or an array of DomainObject choices
    const declaredNestedDomainObjectValue = nested[key]!;
    const DeclaredNestedDomainObjectClassOptions: (typeof DomainObject)[] =
      isArray(declaredNestedDomainObjectValue)
        ? declaredNestedDomainObjectValue
        : [declaredNestedDomainObjectValue];
    const eachIsDomainObjectBased =
      DeclaredNestedDomainObjectClassOptions.every(
        (NestedDomainObject) =>
          NestedDomainObject.prototype instanceof DomainObject, // https://stackoverflow.com/a/14486171/3068233
      );
    if (!eachIsDomainObjectBased)
      throw new NestedDomainObjectHydrationError(
        `each value of each ${domainObjectName}.nested.${key} must be a single typeof DomainObject or an array of options of typeof DomainObject`,
        { dobj: domainObjectName, key, DeclaredNestedDomainObjectClassOptions },
      );

    // check that the implemented value for this nested prop is an object - otherwise, this field must be nullable
    const nestedProp = props[key];
    if (typeof nestedProp !== 'object' || nestedProp === null) return; // skip hydration if its not an object or is null - since no domain object would validate that

    // define how to instantiate a prop into the nested DomainObject out of the specified options
    const declaredNestedClassNameOptionsForProp =
      DeclaredNestedDomainObjectClassOptions.map(
        (ClassOption) => ClassOption.name,
      );
    const instantiateThisPropIfNeeded = (prop: any) => {
      // if it's already an instance of a domain object, then just check that it's one of the options specified and return it if so
      const instantiatedClassName = isOfDomainObject(prop)
        ? prop.constructor.name
        : null;
      if (instantiatedClassName) {
        // if the name is included in the valid nested class options, then return it
        if (
          declaredNestedClassNameOptionsForProp.includes(instantiatedClassName)
        )
          return prop; //  it's already instantiated as a valid domain object. good to go
      }

      // try and instantiate it by leveraging the fact that there's only one option, if possible
      if (DeclaredNestedDomainObjectClassOptions.length === 1)
        return new DeclaredNestedDomainObjectClassOptions[0]!(prop); // this case is easy, since there's only one option

      // otherwise, we must rely on the `_dobj` prop having been set by the `serialize` function or manually
      const declaredClassNameOfProp = prop._dobj;
      if (!declaredClassNameOfProp)
        throw new NestedDomainObjectHydrationError(
          `
DomainObject property ${domainObjectName}.${key} was declared as a nested domain object with ${
            DeclaredNestedDomainObjectClassOptions.length
          } options but was not already instantiated as one of the declared nested domain objects nor did it have a ._dobj key specified from serialization. Can not determine which option to use without one of those two specified.

Please try one of the following
${[
  // recommend adding the class the prop was instantiated with to the list of declared nested class options, if it was instantiated as a domain object already
  instantiatedClassName
    ? `- include the class ${instantiatedClassName}, which ${domainObjectName}.${key} was instantiated with, as one of the declared nested class options for this key`
    : undefined,

  // recommend instantiating the prop w/ the domain object manually, in case they are manually creating domain objects
  `- instantiate ${domainObjectName}.${key} as a nested DomainObject when instantiating ${domainObjectName}`,

  // recommend using the serialize method, in case they were trying to deserialize into domain objects
  `- make sure that you are using the 'serialize' method of this library if deserializing`,
]
  .filter((str) => !!str)
  .join('\n')}
}
          `.trim(),
          {
            key,
            prop,
            instantiatedClassName,
            declaredNestedClassNameOptionsForProp,
          },
        );
      const CorrectNestedDomainObject =
        DeclaredNestedDomainObjectClassOptions.find(
          (ClassOption) => ClassOption.name === declaredClassNameOfProp,
        );
      if (!CorrectNestedDomainObject)
        throw new NestedDomainObjectHydrationError(
          `
DomainObject property ${domainObjectName}.${key} was declared as a nested domain object with ${DeclaredNestedDomainObjectClassOptions.length} options and had a ._dobj key specified on the input. However, the specified ._dobj was not found as one of the declared nested domain object options. In otherwords, the correct class constructor was not present on the DomainObject.nested definition.

Please check the declared nested domain object options for ${domainObjectName}.${key} and update it to include ${declaredClassNameOfProp} or instantiate ${domainObjectName}.${key} with one of the declared options before serialization.
          `.trim(),
          {
            key,
            prop,
            _dobj: declaredClassNameOfProp,
            declaredNestedClassNameOptionsForProp,
          },
        );
      return new CorrectNestedDomainObject(prop);
    };

    // instantiate the prop into the nested DomainObject specified, if not already instantiated
    const hydratedProp = isArray(nestedProp)
      ? nestedProp.map(instantiateThisPropIfNeeded) // if array, then hydrate each
      : instantiateThisPropIfNeeded(nestedProp); // else, hydrate the root

    // and overwrite the prior prop value w/ the hydrated value, in the hydratedProp object
    hydratedProps[key] = hydratedProp;
  });

  // now return the hydrated props
  return hydratedProps;
};
