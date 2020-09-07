# domain-objects

![ci_on_commit](https://github.com/uladkasach/domain-objects/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/uladkasach/domain-objects/workflows/deploy_on_tag/badge.svg)

A simple, convenient way to represent domain objects, leverage domain knowledge, and add runtime validation in your code base.

Guided by [Domain Driven Design](https://dddcommunity.org/learning-ddd/what_is_ddd/)

# Purpose

- promote speaking in a domain driven manner, in code and in speech, by formally defining domain objects
- to make software safer and easier to debug, by supporting run time type checking
- to leverage domain knowledge in your code base
  - e.g., in comparisons of objects
  - e.g., in schema based runtime validation

# Install

```sh
npm install --save domain-objects
```

# Usage Examples

### value object

```ts
// define it
interface Address {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  postal: string;
}
class Address extends DomainValueObject<Address> implements Address {}

// use it
const austin = new Address({
  street: '123 South Congress',
  suite: null,
  city: 'Austin',
  state: 'Texas',
  postal: '78704',
});
```

### entity

```ts
// define it
interface RocketShip {
  uuid?: string;
  serialNumber: string;
  fuelQuantity: number;
  passengers: number;
  homeAddress: Address;
}
class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
  public static unique = ['serialNumber'];
}

// use it
const ship = new RocketShip({
  serialNumber: 'SN5,
  fuelQuantity: 9001,
  passengers: 21,
  homeAddress: new Address({ ... }),
});
```

### runtime validation

```ts
// define your domain object with a schema this time
interface Address {
  id?: number;
  galaxy: string;
  solarSystem: string;
  planet: string;
  continent: string;
}
const schema = Joi.object().keys({
  id: Joi.number().optional(),
  galaxy: Joi.string().valid(['Milky Way', 'Andromeda']).required(),
  solarSystem: Joi.string().required(),
  planet: Joi.string().required(),
  continent: Joi.string().required(),
});
class Address extends DomainValueObject<Address> implements Address {
  public static schema = schema; // supports Joi and Yup
}

// and now when you instantiate objects, the props you instantiate with will be runtime validated
const northAmerica = new Address({
  galaxy: 'Milky Way',
  solarSystem: 'Sun',
  planet: 'Earth',
  continent: 'North America',
}); // passes, no error

const westDolphia = new Address({
  galaxy: 'AndromedA', // oops, accidentally capitalized the last A in Andromeda - this will fail the enum check!
  solarSystem: 'Asparagia',
  planet: 'Dracena',
  continent: 'West Dolphia',
}); // throws a helpful error, see the `Features` section below for details
```

### identity comparison

```ts
import { serialize, getUniqueIdentifier } from 'domain-objects';

const northAmerica = new Address({
  galaxy: 'Milky Way',
  solarSystem: 'Sun',
  planet: 'Earth',
  continent: 'North America',
});
const northAmericaWithId = new Address({
  id: 821, // we pulled this record from the db, so it has an id
  galaxy: 'Milky Way',
  solarSystem: 'Sun',
  planet: 'Earth',
  continent: 'North America',
});

// is `northAmerica` the same object as `northAmericaWithId`?
const areTheSame = serialize(getUniqueIdentifier(northAmerica)) === serialize(getUniqueIdentifier(northAmericaWithId)); // because of domain modeling, we know definitively that this is `true`!
```

### change detection

```ts
import { serialize } from 'domain-objects';

// shiny new spaceship, full of fuel
const sn5 = new Spaceship({
  serialNumber: 'SN5',
  fuelQuantity: 9001,
  passengers: 21,
});

// which is owned by this spaceport
const spaceport = new Spaceport({
  uuid: '__SPACEPORT_UUID__',
  address: northAmerica,
  spaceships: [sn5],
});

// we do some business logic, and in the process, the space ship flys around and uses up fuel
const sn5AfterFlying = new Spaceship({ ...sn5, fuelQuantity: 4500 });

// now we want to check: has the spaceport been updated over this time? We pull the data fron the database, and the database returns this response
const spaceportAfterFlight = new Spaceport({
  uuid: '__SPACEPORT_UUID__',
  address: northAmerica,
  spaceships: [sn5AfterFlying], // note! the spaceships[0].fuelQuantity has changed
});

// so, given that spaceport.spaceships[0].fuelQuantity has changed, does that mean that the spaceport has changed?
const hasChanged = serialize(spaceport) !== serialize(spaceportAfterFlight); // because of domain modeling, we know the answer is `false`! (although the spaceship used fuel, the spaceport itself did not change)
```

# Features

## Modeling

Modeling is a fundamental part of domain driven design. Here is how you can represent your model in your code - to aid in building a ubiquitous language.

### `DomainValueObject`

In Domain Driven Design, a Value Object is a type of Domain Object for which:

- properties are immutable (e.g., its a fact)
- identity does not matter
  - i.e., it is uniquely identifiable by its properties
  - i.e., if you change the value of any of its properties, it is now considered a new value-object

```ts
// define it
interface Address {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  postal: string;
}
class Address extends DomainValueObject<Address> implements Address {}

// use it
const austin = new Address({
  street: '123 South Congress',
  suite: null,
  city: 'Austin',
  state: 'Texas',
  postal: '78704',
});
```

### `DomainEntity`

In Domain Driven Design, an Entity is a type of Domain Object for which:

- properties change over time (e.g., it has a life cycle)
- identity matters
  - e.g., two entities could have the same properties, differing only by id, and are still considered different entities
  - e.g., you can update properties on an entity and it is still considered the same entity

```ts
// define it
interface RocketShip {
  uuid?: string;
  serialNumber: string;
  fuelQuantity: number;
  passengers: number;
  homeAddress: Address;
}
class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
  /**
   * in domain modeling, entities are not uniquely identifiable by all of their properties like value objects are.
   *
   * due to this, in order to use the `getUniqueIdentifier` and `serialize` methods on domain entities,
   * we must define the properties that the entity is uniquely identifiable by.
   */
  public static unique = ['serialNumber']; // note: if the entity is not uniquely identifiable by any natural keys, its `uuid` or `id` is a good option; but if you are lucky to have a natural key for the entity, definitely use it
}

// use it
const ship = new RocketShip({
  serialNumber: 'SN5,
  fuelQuantity: 9001,
  passengers: 21,
  homeAddress: new Address({ ... }),
});
```

## Run Time Validation

Runtime validation is a great way to fail fast and prevent unexpected errors.

`domain-objects` supports an easy way to add runtime validation, by defining a [`Joi`](https://github.com/sideway/joi) or [`Yup`](https://github.com/jquense/yup) schema.

When you provide a schema in your type definition, your domain objects will now be run time validated at instantiation.

example:

```ts
// with this declaration of a "RocketShip", the schema specifies that there can be a max of 42 passengers
interface RocketShip {
  serialNumber: string;
  fuelQuantity: number;
  passengers: number;
}
const schema = Joi.object().keys({
  serialNumber: Joi.string().uuid().required(),
  fuelQuantity: Joi.number().required(),
  passengers: Joi.number().max(42).required(),
});
class RocketShip extends DomainObject<RocketShip> implements RocketShip {
  public static schema = schema;
}

// so if we try the following, we will get an error
new RocketShip({
  serialNumber: uuid(),
  fuelQuantity: 9001,
  passengers: 50,
});

// throws JoiValidationError
```

We made sure that the errors are as descriptive as possible to help with debugging. For example, the error that would have been shown above has the following message:

```
Errors on 1 properties were found while validating properties for domain object RocketShip.:
[
  {
    "message": "\"passengers\" must be less than or equal to 42",
    "path": "passengers",
    "type": "number.max"
  }
]

Props Provided:
{
  "serialNumber": "eeb6988c-d877-4268-b841-bde2f40b377e",
  "fuelQuantity": 9001,
  "passengers": 50
}
```

## Nested Hydration

> _TL:DR;_ Without `DomainObject.nested`, you will need to manually instantiate nested domain objects every time. If you forget, `getUniqueIdentifier` and `serialize` will throw errors.

Nested hydration is useful when instantiating DomainObjects that are composed of other DomainObjects. For example, in the `RocketShip` example above, `RocketShip` has `Address` as a nested property (i.e., `typeof Spaceship.address === Address`).

When attempting to manipulate DomainObjects with nested DomainObjects, like the Spaceship.address example, it is important that all nested domain objects are instantiated with their class. Otherwise, if `RocketShip.address` is not an instanceof `Address`, then we will not be able to utilize the domain information baked into the static properties of `Address` (e.g., that it is a DomainValueObject).

`domain-objects` makes it easy to instantiate nested DomainObjects, by exposing the `DomainObject.nested` static property.

For example:

```ts
// define the domain objects that you'll be nesting
interface PlantPot {
  diameterInInches: number;
}
class PlantPot extends DomainValueObject<PlantPot> implements PlantPot {}
interface PlantOwner {
  name: string;
}
class PlantOwner extends DomainEntity<PlantOwner> implements PlantOwner {}

// define the plant
interface Plant {
  pot: PlantPot;
  owners: PlantOwner[];
  lastWatered: string;
}
class Plant extends DomainEntity<Plant> implements Plant {
  /**
   * define that `pot` and `owners` are nested domain objects, and specify which domain objects they are, so that they can be hydrated during instantiation if needed.
   */
  public static nested = { pot: PlantPot, owners: PlantOwner };
}

// instantiate your domain object
const plant = new Plant({
  pot: { diameterInInches: 7 }, // note, not an instance of `PlantPot`
  owners: [{ name: 'bob' }], // note, not an instance of `PlantOwner`
  lastWatered: 'monday',
});

// and find that, because `.nested.pot` was defined, `pot` was instantiated as a `PlantPot`
expect(plant.pot).toBeInstanceOf(PlantPot);

// and find that, because `.nested.owners` was defined, each element of `owners` was instantiated as a `PlantOwner`
plant.owners.forEach((owner) => expect(owner).toBeInstance(PlantOwner));
```

You may be thinking to yourself, "Didn't i just define what the nested DomainObjects were in the type definition, when defining the interface? Why do i have to define it again?". Agreed! Unfortunately, typescript removes all type information at runtime. Therefore, we have no choice but to repeat this information in another way if we want to use this information at runtime. (See #8 for progress on automating this).

## fn `getUniqueIdentifier(obj: DomainEntity | DomainValueObject)`

Domain modeling gives us the context of what properties uniquely identify a domain object.

i.e.,:

- value objects are uniquely identified by all of their properties (excluding autogenerated `id` and `uuid`)
- entities are uniquely identified by the explicitly defined subset of properties, documented in the class definition

this `getUniqueIdentifier` function leverages this knowledge to return a normal object containing only the properties that uniquely identify the domain object you give it.

## fn `serialize(value: any)`

Domain modeling gives additional information that we can use for `change detection` and `identity comparisons`.

`domain-objects` allows us to use that information conveniently with the functions `serialize`.

`serialize` deterministically converts any object you give it into a string representation:

- deterministically sort all array items
- deterministically sort all object keys
- remove non-unique properties from nested domain objects

due to this deterministic serialization, we are able to use this fn for [`change detection`](#change-detection) and [`identity comparisons`](#identity-comparison). See the [examples](#usage-examples) section above for an example of each.
