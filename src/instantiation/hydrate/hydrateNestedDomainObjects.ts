/* eslint-disable no-underscore-dangle */
import { DomainObject } from '../DomainObject';

const isArray = <T>(val: T | Array<T>): val is Array<T> => Array.isArray(val);

export const hydrateNestedDomainObjects = ({
  props,
  nested,
  domainObjectName,
}: {
  props: Record<string, any>;
  nested: Record<string, typeof DomainObject | typeof DomainObject[]>;
  domainObjectName: string;
}) => {
  // create a new object, so as to not mutate original props
  const hydratedProps: Record<string, any> = { ...props };

  // drop the "_dobj" prop, if one was defined due to serialization
  delete hydratedProps._dobj; // eslint-disable-line no-underscore-dangle

  // for each key that we were told is a nested domain object
  Object.keys(nested).forEach((key) => {
    // check that the value of "nested" was defined as a DomainObject or an array of DomainObject choices
    const declaredNestedDomainObjectValue = nested[key];
    const DeclaredNestedDomainObjectClassOptions: typeof DomainObject[] = isArray(declaredNestedDomainObjectValue)
      ? declaredNestedDomainObjectValue
      : [declaredNestedDomainObjectValue];
    const eachIsDomainObjectBased = DeclaredNestedDomainObjectClassOptions.every(
      (NestedDomainObject) => NestedDomainObject.prototype instanceof DomainObject, // https://stackoverflow.com/a/14486171/3068233
    );
    if (!eachIsDomainObjectBased)
      throw new Error('each key of DomainObject.nested must be a single typeof DomainObject or an array of options of typeof DomainObject');

    // check that the implemented value for this nested prop is an object - otherwise, this field must be nullable
    const nestedProp = props[key];
    if (typeof nestedProp !== 'object' || nestedProp === null) return; // skip hydration if its not an object or is null - since no domain object would validate that

    // define how to instantiate a prop into the nested DomainObject out of the specified options
    const declaredValidNestedClassNameOptionsForProp = DeclaredNestedDomainObjectClassOptions.map((ClassOption) => ClassOption.name);
    const instantiateThisPropIfNeeded = (prop: any) => {
      // if it's already an instance of a domain object, then just check that it's one of the options specified and return it if so
      if (prop instanceof DomainObject) {
        const instantiatedClassName = prop.constructor.name;
        if (!declaredValidNestedClassNameOptionsForProp.includes(instantiatedClassName))
          throw new Error(
            `DomainObject property ${domainObjectName}.${key} was instantiated with a constructor which was not included in the list of valid declared DomainObject.nested options for the property.\n\n${JSON.stringify(
              {
                instantiatedClassName,
                declaredValidNestedClassNameOptionsForProp,
              },
            )}`,
          );
        return prop; // otherwise, it's already instantiated as a valid domain object. good to go
      }

      // try and instantiate it by leveraging the fact that there's only one option, if possible
      if (DeclaredNestedDomainObjectClassOptions.length === 1) return new DeclaredNestedDomainObjectClassOptions[0](prop); // this case is easy, since there's only one option

      // otherwise, we must rely on the `_dobj` prop having been set by the `serialize` function or manually
      const declaredClassNameOfProp = prop._dobj;
      if (!declaredClassNameOfProp)
        throw new Error(
          `DomainObject property ${domainObjectName}.${key} was declared as a nested domain object with ${
            DeclaredNestedDomainObjectClassOptions.length
          } options but no ._dobj key was specified on the input. Can not determine which option to use without this.\n\n${JSON.stringify({
            prop,
            declaredValidNestedClassNameOptionsForProp,
          })}`,
        );
      const CorrectNestedDomainObject = DeclaredNestedDomainObjectClassOptions.find((ClassOption) => ClassOption.name === declaredClassNameOfProp);
      if (!CorrectNestedDomainObject)
        throw new Error(
          `DomainObject property ${domainObjectName}.${key} was declared as a nested domain object with ${
            DeclaredNestedDomainObjectClassOptions.length
          } options and had a ._dobj key specified on the input. However, the specified ._dobj was not found as one of the declared nested domain object options. In otherwords, the correct class constructor was not present on the DomainObject.nested definition. \n\n${JSON.stringify(
            {
              prop,
              declaredClassNameOfProp,
              declaredValidNestedClassNameOptionsForProp,
            },
          )}`,
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
