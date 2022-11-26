import { DomainObject } from '../DomainObject';

export const hydrateNestedDomainObjects = ({ props, nested }: { props: Record<string, any>; nested: Record<string, typeof DomainObject> }) => {
  // create a new object, so as to not mutate original props
  const hydratedProps: Record<string, any> = { ...props };

  // drop the "_dobj" prop, if one was defined due to serialization
  delete hydratedProps._dobj; // eslint-disable-line no-underscore-dangle

  // for each key that we were told is a nested domain object
  Object.keys(nested).forEach((key) => {
    // check that the value of "nested" was defined as a DomainObject
    const NestedDomainObject = nested[key];
    const isDomainObjectBased = NestedDomainObject.prototype instanceof DomainObject; // https://stackoverflow.com/a/14486171/3068233
    if (!isDomainObjectBased) throw new Error('each key of DomainObject.nested must be a typeof DomainObject');

    // check that the nested props are an object - otherwise, this field must be nullable
    const nestedProps = props[key];
    if (typeof nestedProps !== 'object' || nestedProps === null) return; // skip hydration if its not an object or is null - since no domain object would validate that

    // instantiate the prop into the nested DomainObject specified
    const isArrayProp = Array.isArray(nestedProps);
    const hydratedProp = isArrayProp
      ? nestedProps.map((nestedPropsSet: any) => new NestedDomainObject(nestedPropsSet)) // if array, then hydrate each
      : new NestedDomainObject(nestedProps); // else, hydrate the root

    // and overwrite the prior prop value w/ the hydrated value, in the hydratedProp object
    hydratedProps[key] = hydratedProp;
  }); // eslint-disable-line no-return-assign

  // now return the hydrated props
  return hydratedProps;
};
