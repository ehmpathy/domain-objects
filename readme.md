# domain-objects

![test](https://github.com/ehmpathy/domain-objects/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/domain-objects/workflows/publish/badge.svg)

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

### literal

```ts
import { DomainLiteral } from 'domain-objects';

// define it
interface Address {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  postal: string;
}
class Address extends DomainLiteral<Address> implements Address {}

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
import { DomainEntity } from 'domain-objects';

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
  public static updatable = ['fuelQuantity', 'homeAddress'];
}

// use it
const ship = new RocketShip({
  serialNumber: 'SN5',
  fuelQuantity: 9001,
  passengers: 21,
  homeAddress: new Address({ ... }),
});
```


### event

```ts
import { DomainEvent } from 'domain-objects';

// define it
interface AirQualityMeasuredEvent {
  locationUuid: string;
  sensorUuid: string;
  occurredAt: string;
  temperature: string;
  humidity: string;
  pressure: string;
  pm2p5: string; // PM2.5 : fine inhalable particles, with diameters that are generally 2.5 micrometers
  pm5p0: string; // PM5.0
  pm10p0: string; // PM10.0
}
class AirQualityMeasuredEvent extends DomainEvent<AirQualityMeasuredEvent> implements AirQualityMeasuredEvent {
  public static unique = ['locationUuid', 'sensorUuid', 'occurredAt'];
}

// use it
const event = new AirQualityMeasuredEvent({
  locationUuid: '8e34eb9b-2874-43e0-bc89-73a73d50ac5c',
  sensorUuid: 'a17f7941-1211-44f4-a22a-b61f220527da',
  occurredAt: '2021-07-08T11:13:38.780Z',
  temperature: '31.52°C',
  humidity: '27%rh',
  pressure: '29.99bar',
  pm2p5: '9ug/m3',
  pm5p0: '11ug/m3',
  pm10p0: '17ug/m3',
});
```

### runtime validation

> everyone has types until they get punched in the runtime - mike typeson

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
class Address extends DomainLiteral<Address> implements Address {
  public static schema = schema; // supports Zod, Yup, and Joi
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
import { serialize, omitMetadataValues } from 'domain-objects';

// shiny new spaceship, full of fuel
const sn5 = new Spaceship({
  serialNumber: 'SN5',
  fuelQuantity: 9001,
  passengers: 21,
});

// lets save it to the database
const sn5Saved = new Spaceship({ ...sn5, id: 821, updatedAt: now() }); // the database will add metadata to it

// lets check that in the process of saving to the database, no unexpected changes were introduced
const hadChangeDuringSave = serialize(omitMetadataValues(sn5)) !== serialize(omitMetadataValues(sn5Saved)); // note: we omit the metadata values since we dont care that one has db generated values like id specified and the other does not
expect(hadChangeDuringSave).toEqual(false); // even though an id was added to sn5Saved, the non-metadata attributes have not changed, so we can say there is no change as desired

// we do some business logic, and in the process, the space ship flys around and uses up fuel
const sn5AfterFlying = new Spaceship({ ...sn5, fuelQuantity: 4500 });

// lets programmatically detect whether there was a change now
const hadChangeAfterFlying = serialize(omitMetadataValues(spaceport)) !== serialize(omitMetadataValues(spaceportAfterFlight));
expect(hadChangeAfterFlying).toEqual(true); // because the fuelQuantity has decreased, the Spaceship has had a change after flying
```

# Features

## Modeling

Modeling is a fundamental part of domain driven design. Here is how you can represent your model in your code - to aid in building a ubiquitous language.

### `DomainLiteral`

In Domain Driven Design, a Literal (a.k.a. Value Object), is a type of Domain Object for which:

 - properties are immutable
   - i.e., it represents some literal value which happens to have a structured object shape
   - i.e., if you change the value of any of its properties, it is a different literal
 - identity does not matter
   - i.e., it is uniquely identifiable by its non-metadata properties

```ts
// define it
interface Address {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  postal: string;
}
class Address extends DomainLiteral<Address> implements Address {}

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

- properties change over time
  - e.g., it has a lifecycle
- identity matters
  - i.e., it represents a distinct existence
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
   * an entity is uniquely identifiable by some subset of their properties
   *
   * in order to use the `getUniqueIdentifier` and `serialize` methods on domain entities,
   * we must define the properties that the entity is uniquely identifiable by.
   */
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

## Run Time Validation

Runtime validation is a great way to fail fast and prevent unexpected errors.

`domain-objects` supports an easy way to add runtime validation, by defining a [`Zod`](https://github.com/colinhacks/zod), [`Yup`](https://github.com/jquense/yup), or [`Joi`](https://github.com/sideway/joi) schema.

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

When attempting to manipulate DomainObjects with nested DomainObjects, like the Spaceship.address example, it is important that all nested domain objects are instantiated with their class. Otherwise, if `RocketShip.address` is not an instanceof `Address`, then we will not be able to utilize the domain information baked into the static properties of `Address` (e.g., that it is a DomainLiteral).

`domain-objects` makes it easy to instantiate nested DomainObjects, by exposing the `DomainObject.nested` static property.

For example:

```ts
// define the domain objects that you'll be nesting
interface PlantPot {
  diameterInInches: number;
}
class PlantPot extends DomainLiteral<PlantPot> implements PlantPot {}
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

## fn `getUniqueIdentifier(obj: DomainEntity | DomainLiteral)`

Domain models inform us of what properties uniquely identify a domain object.

i.e.,:
- literals are uniquely identified by all of their non-metadata properties
- entities are uniquely identified by an explicitly subset of their properties, declared via the `.unique` static property

this `getUniqueIdentifier` function leverages this knowledge to return a normal object containing only the properties that uniquely identify the domain object you give it.

## fn `serialize(value: any)`

Domain modeling gives additional information that we can use for `change detection` and `identity comparisons`.

`domain-objects` allows us to use that information conveniently with the functions `serialize`.

`serialize` deterministically converts any object you give it into a string representation:

- deterministically sort all array items
- deterministically sort all object keys
- remove non-unique properties from nested domain objects

due to this deterministic serialization, we are able to use this fn for [`change detection`](#change-detection) and [`identity comparisons`](#identity-comparison). See the [examples](#usage-examples) section above for an example of each.
