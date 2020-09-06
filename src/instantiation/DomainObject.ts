import { hydrateNestedDomainObjects } from './hydrate/hydrateNestedDomainObjects';
import { SchemaOptions, validate } from './validate/validate';

/**
 * Domain Object
 *
 * Responsibilities:
 * - optionally validate the properties that are passed into the constructor against the schema at runtime, if schema is supplied
 * - assign all properties that are passed into constructor to self, after optional runtime validation
 */
export class DomainObject<T extends Record<string, any>> {
  constructor(props: T) {
    // 1. validate with the schema if provided
    const { schema } = this.constructor as typeof DomainObject; // `this.constructor` does not get typed to DomainObject automatically by ts; https://stackoverflow.com/questions/33387318/access-to-static-properties-via-this-constructor-in-typescript
    if (schema) validate({ props, schema, domainObjectName: this.constructor.name });

    // 2. hydrate any nested props present; just overwrite the orig props for each "nested" key
    const nested = ((this.constructor as typeof DomainObject).nested ?? {}) as Record<string, typeof DomainObject>;
    const hydratedProps = hydrateNestedDomainObjects({ props, nested });

    // 3. assign all properties to self if passed validation
    Object.assign(this, hydratedProps);
  }

  /**
   * DomainObject.schema
   *
   * When set, will be used to validate the properties passed into the constructor at runtime (i.e., during instantiation)
   *
   * Supports [`Joi`](https://github.com/sideway/joi) and [`Yup`](https://github.com/jquense/yup)
   */
  public static schema?: SchemaOptions;

  /**
   * DomainObject.nested
   *
   * When set, will be used to hydrate nested DomainObjects. This is especially useful when instantiating nested domain objects from data stores (e.g., apis or databases). This is _required_ in order to safely use the `serialize` and `getUniqueIdentifier` functions - as those functions check static properties of domain objects to function correctly.
   *
   * For example:
   * ```ts
   * // define the plant pot
   * interface PlantPot {
   *   diameterInInches: number;
   * }
   * class PlantPot extends DomainObject<PlantPot> implements PlantPot {}
   *
   * // define the plant owner
   * interface PlantOwner {
   *   diameterInInches: number;
   * }
   * class PlantOwner extends DomainObject<PlantOwner> implements PlantOwner {}
   *
   * // define the plant
   * interface Plant {
   *   pot: PlantPot;
   *   owners: PlantOwner[];
   *   lastWatered: string;
   * }
   * class Plant extends DomainObject<Plant> implements Plant {
   *   public static nested = { pot: PlantPot, owners: PlantOwner }
   * }
   *
   * // and show that it hydrates the plant pot
   * const plant = new Plant({ pot: { diameterInInches: 7 }, owners: [{ name: 'bob' }], lastWatered: 'monday' }); // notice how the param of `pot` we're inputting is _not_ an instance of `PlantPot`, and `owners` are not instances of `PlantOwner`
   * expect(plant.pot).toBeInstanceOf(PlantPot); // now succeeds, as during instantiation we hydrated `pot` into an instance of `PlantPot`, due to `Plant.nested.pot` being set
   * plant.owners.forEach((owner) => expect(owner).toBeInstance(PlantOwner)); // also succeeds, since during instantiation we hydrated each `owner` into an instance of `PlantOwner`, due to `Plant.nested.owners` being set
   * ```
   */
  public static nested?: Record<string, DomainObject<any>>; // TODO: find a way to make this Record<keyof string>
}
