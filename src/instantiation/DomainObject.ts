import { withImmute, type WithImmute } from '../manipulation/immute/withImmute';
import { type DomainObjectShape } from '../reference/Refable';
import { hydrateNestedDomainObjects } from './hydrate/hydrateNestedDomainObjects';
import { type SchemaOptions, validate } from './validate/validate';
import { VERSION } from './version';

// marker symbol (cross-version, global registry)
export const MARK_AS_DOMAIN_OBJECT = Symbol.for('domain-objects/DomainObject');

export interface DomainObjectInstantiationOptions {
  /**
   * allow callers to skip certain aspects of instantiation
   *
   * e.g., for performance optimizations in specific usecases
   */
  skip?: {
    /**
     * allow callers to skip schema validation
     *
     * usecase examples
     * - deserialize: schema validation increases deserialization time dramatically (10-100x) (especially if using Joi, that thing is slow!)
     */
    schema?: boolean;
  };
}

/**
 * Domain Object
 *
 * Responsibilities:
 * - optionally validate the properties that are passed into the constructor against the schema at runtime, if schema is supplied
 * - assign all properties that are passed into constructor to self, after optional runtime validation
 */
export class DomainObject<T extends DomainObjectShape> {
  constructor(props: T, options?: DomainObjectInstantiationOptions) {
    // 1. validate with the schema if provided
    const { schema } = this.constructor as typeof DomainObject; // `this.constructor` does not get typed to DomainObject automatically by ts; https://stackoverflow.com/questions/33387318/access-to-static-properties-via-this-constructor-in-typescript
    if (schema && !(options?.skip?.schema === true))
      validate({ props, schema, domainObjectName: this.constructor.name });

    // 2. hydrate any nested props present; just overwrite the orig props for each "nested" key
    const nested = ((this.constructor as typeof DomainObject).nested ??
      {}) as Record<string, typeof DomainObject>;
    const hydratedProps = hydrateNestedDomainObjects({
      domainObjectName: this.constructor.name,
      props,
      nested,
    });

    // 3. assign all properties to self if passed validation
    Object.assign(this, hydratedProps);
  }

  /**
   * DomainObject marker symbol for cross-version compatibility.
   *
   * Uses Symbol.for() to create a global symbol that works across different versions
   * of the domain-objects library. The value is the version string.
   */
  public static readonly [MARK_AS_DOMAIN_OBJECT] = VERSION;

  /**
   * DomainObject.alias
   *
   * When set, declares the alias via which domain objects of this class are known to be referred to.
   *
   * For example
   * - PlantPot.alias = 'pot'
   * - Bird.alias = { singular: 'bird', plural: 'flock' }
   *
   * Relevance
   * - formalizes that we can expect to see the dobj referred to by this alias
   * - enables code generators to use this colloquial alias in contracts for better devex
   */
  public static alias?: string | { plural?: string; singular?: string };

  /**
   * DomainObject.schema
   *
   * When set, will be used to validate the properties passed into the constructor at runtime (i.e., during instantiation)
   *
   * Supports [`Zod`](https://github.com/colinhacks/zod), [`Joi`](https://github.com/sideway/joi), and [`Yup`](https://github.com/jquense/yup)
   */
  public static schema?: SchemaOptions<any>; // todo: work around typescript's "static members cant reference class type parameters"

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

  /**
   * DomainObject.metadata
   *
   * When set, customizes the keys that are considered as metadata of this domain object.
   *
   * Context,
   * - domain objects are often persisted inside of storage mechanisms that assign metadata to them, such as ids or timestamps
   * - metadata is a special subset of readonly: attributes set by the persistence layer that describe the persistence of the object (not intrinsic attributes of the domain object itself)
   * - metadata is applicable to all domain objects (entities, events, and literals)
   *
   * Metadata vs Readonly,
   * - both metadata and readonly are set by the persistence layer
   * - metadata describes how the object is persisted (e.g., id, uuid, createdAt) - not the object itself
   * - readonly (non-metadata) describes intrinsic attributes of the object that the persistence layer sets (e.g., deployed ip address, deployed host, etc)
   *
   * Relevance,
   * - metadata properties do not contribute to the unique key of a DomainLiteral
   * - metadata properties can be easily stripped from an object by using the `omitMetadata` method
   * - all readonly properties (metadata + explicit readonly) can be stripped using `omitReadonly`
   *
   * By default,
   * - `id`, `createdAt`, `updatedAt`, and `effectiveAt` are considered metadata keys
   * - `uuid` is also considered a metadata key, if it is not included in the unique key of the DomainEntity or DomainEvent
   *
   * @see DomainEntity.readonly - for broader readonly attributes on entities (intrinsic attributes set by persistence layer)
   */
  public static metadata: readonly string[];

  /**
   * .what = an interface via which to construct instances w/ immute operations
   *
   * .why =
   *   - immute operations such as .clone produce more maintainable code by preventing unexpected mutations
   *   - these immute operations provide a safe pit of success for common operations
   *
   * .note =
   *   - you can add withImmute to any dobj yourself, even if it wasn't built via this .build procedure
   *   - you can override the .build to add your own domain's getters, too
   */
  static build<TInstance extends DomainObjectShape>(
    this: new (props: TInstance) => TInstance,
    props: ConstructorParameters<typeof this>[0],
  ): WithImmute<TInstance> {
    const instance = new this(props);
    return withImmute(instance);
  }

  /**
   * .as = alias for .build
   */
  static as = this.build;
}
