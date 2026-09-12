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

> everyone has types until they get punched in the runtime - mike typeson 🥊

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
import { serialize, omitMetadata } from 'domain-objects';

// shiny new spaceship, full of fuel
const sn5 = new Spaceship({
  serialNumber: 'SN5',
  fuelQuantity: 9001,
  passengers: 21,
});

// lets save it to the database
const sn5Saved = new Spaceship({ ...sn5, id: 821, updatedAt: now() }); // the database will add metadata to it

// lets check that in the process of saving to the database, no unexpected changes were introduced
const hadChangeDuringSave = serialize(omitMetadata(sn5)) !== serialize(omitMetadata(sn5Saved)); // note: we omit the metadata values since we dont care that one has db generated values like id specified and the other does not
expect(hadChangeDuringSave).toEqual(false); // even though an id was added to sn5Saved, the non-metadata attributes have not changed, so we can say there is no change as desired

// we do some business logic, and in the process, the space ship flys around and uses up fuel
const sn5AfterFlying = new Spaceship({ ...sn5, fuelQuantity: 4500 });

// lets programmatically detect whether there was a change now
const hadChangeAfterFlying = serialize(omitMetadata(spaceport)) !== serialize(omitMetadata(spaceportAfterFlight));
expect(hadChangeAfterFlying).toEqual(true); // because the fuelQuantity has decreased, the Spaceship has had a change after flying
```

# Features

## Declaration

Model declaration is a fundamental part of domain driven design. Here is how you can declare your model in your code - to aid in building a ubiquitous language.

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

## References (`Ref`, `RefByUnique`, `RefByPrimary`)

In work with entities and events, you often need to refer to them by their **primary key** (e.g., `uuid`) or by their **unique keys** (e.g., a compound unique such as `{ source, exid }`). `domain-objects` provides utility types to make this type-safe.

### `RefByPrimary<typeof DomainObject>`

RefByPrimary extracts the shape of the primary key for a given domain object.

```ts
import { DomainEntity, RefByPrimary } from 'domain-objects';

interface SeaTurtle {
  uuid?: string;
  seawaterSecurityNumber: string;
  name: string;
}
class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
  public static primary = ['uuid'] as const;
  public static unique = ['seawaterSecurityNumber'] as const;
}

// ✅ valid
const primaryRef: RefByPrimary<typeof SeaTurtle> = { uuid: 'beefbeef...' };

// ❌ invalid - must be a string
const wrongType: RefByPrimary<typeof SeaTurtle> = { uuid: 8335 };

// ❌ invalid - wrong key
const wrongKey: RefByPrimary<typeof SeaTurtle> = { guid: 'beefbeef...' };

// ❌ invalid - missing primary key
const missing: RefByPrimary<typeof SeaTurtle> = {};
```

### `RefByUnique<typeof DomainObject>`

RefByUnique extracts the shape of the unique key(s) for a given domain object.

```ts
import { DomainEntity, RefByUnique } from 'domain-objects';

interface SeaTurtle {
  uuid?: string;
  seawaterSecurityNumber: string;
  name: string;
}
class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
  public static primary = ['uuid'] as const;
  public static unique = ['seawaterSecurityNumber'] as const;
}

// ✅ valid
const uniqueRef: RefByUnique<typeof SeaTurtle> = { seawaterSecurityNumber: 'ABC-999' };

// ❌ invalid - wrong type
const wrongType: RefByUnique<typeof SeaTurtle> = { seawaterSecurityNumber: 999 };

// ❌ invalid - wrong key
const wrongKey: RefByUnique<typeof SeaTurtle> = { saltwaterSecurityNumber: 'ABC-999' };

// ❌ invalid - empty object
const empty: RefByUnique<typeof SeaTurtle> = {};
```

### `Ref<typeof DomainObject>`

Ref is a union type that allows referring to a domain object by either primary key or unique keys.

```ts
import { DomainEntity, Ref } from 'domain-objects';

interface EarthWorm {
  uuid?: string;
  soilSecurityNumber: string;
  wormSegmentNumber: string;
  name: string;
}
class EarthWorm extends DomainEntity<EarthWorm> implements EarthWorm {
  public static primary = ['uuid'] as const;
  public static unique = ['soilSecurityNumber', 'wormSegmentNumber'] as const;
}

// ✅ primary
const byPrimary: Ref<typeof EarthWorm> = { uuid: 'beefbeef...' };

// ✅ unique
const byUnique: Ref<typeof EarthWorm> = {
  soilSecurityNumber: 'SOIL-001',
  wormSegmentNumber: 'SEG-42',
};

// ❌ invalid - missed part of unique key
const incompleteUnique: Ref<typeof EarthWorm> = { soilSecurityNumber: 'SOIL-001' };

// ❌ invalid - not related to either key
const wrongKey: Ref<typeof EarthWorm> = { guid: 'beefbeef...' };

// ❌ invalid - empty object
const empty: Ref<typeof EarthWorm> = {};
```

👉 Use `RefByPrimary` for primary-only references,
👉 `RefByUnique` for unique-only references,
👉 `Ref` when you want to allow either.

> For the **schema-level** counterpart that survives `z.toJSONSchema()`, see [`contract().ref(by?)`](#method-contractrefby) - it stamps an `x-domain-object-ref` pragma so a reference crosses the wire as a first-class, named artifact.

### Instantiating Reference Objects

You can instantiate reference objects directly using the `RefByUnique` or `RefByPrimary` constructors:

```ts
import { RefByUnique, RefByPrimary } from 'domain-objects';

// Using RefByUnique
const turtleRef = RefByUnique.build<typeof SeaTurtle>({
  seawaterSecurityNumber: '821',
});

// Using RefByPrimary
const turtleRefById = RefByPrimary.build<typeof SeaTurtle>({
  uuid: 'beefbeef-cafe-babe-0000-000000000001',
});
```

### Nested Reference Hydration

Just like other nested domain objects, references can be automatically hydrated when used as nested properties:

```ts
import { DomainEntity, RefByUnique, RefByPrimary } from 'domain-objects';

interface SeaTurtleShell {
  turtle: RefByUnique<typeof SeaTurtle>;
  algea: 'ALOT' | 'ALIL';
}
class SeaTurtleShell extends DomainEntity<SeaTurtleShell> implements SeaTurtleShell {
  public static unique = ['turtle'] as const;
  public static nested = {
    turtle: RefByUnique<typeof SeaTurtle>,
  };
}

// now you can pass a plain object and it will be hydrated as a RefByUnique
const shell = new SeaTurtleShell({
  turtle: { seawaterSecurityNumber: '821' }, // plain object
  algea: 'ALOT',
});

expect(shell.turtle).toBeInstanceOf(RefByUnique); // ✅ automatically hydrated!
expect(shell.turtle.seawaterSecurityNumber).toEqual('821');
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


## method `DomainObject.contract()`

`schema` _validates_ your data. `contract()` _identifies_ and _instantiates_ it.

`X.contract()` returns your `Zod` schema, stamped with the domain object's identity and key metadata as an `x-domain-object` pragma, that **parses plain wire json into a live instance of `X`** - typed as `X`, not as the base class.

A domain object has exactly **two contractual concerns**, and this one declaration serves both:

| concern | when | you call |
|---|---|---|
| **instantiation** | request time, at a boundary | `X.contract().parse(wire)` → a live `X` (with `.clone`) |
| **introspection** | build / deploy time, for codegen + openapi | `z.toJSONSchema(X.contract(), { io: 'input' })` → the wire shape + the pragma |

> ⚠️ **every emit passes `{ io: 'input' }`** - at **both** borders of an endpoint. `io` names which **side** of the contract you describe (the wire side vs the instance side), never which **border** of the endpoint you sit at. Since `contract()` coerces, its out side is a class instance, which json-schema cannot represent - so `{ io: 'output' }` (and the default) **throws**. See [the two borders](#the-two-borders) below.

> ⛔ **there is no `z.encode`.** `contract()` ships as a `.transform()`, not a `z.codec`, so it has a forward direction only - use `.parse` at **both** borders. See [there is no `z.encode`](#-there-is-no-zencode---use-parse-at-both-borders) below.

> _note:_ it is a **call**, not a property. TypeScript carries a subclass's identity through a call and never through a property access, so only `X.contract()` can hand back a schema that names `X`. Invoke it on the class; a bare `X.contract` is a plain function, and a `z.object` position that gets it throws _"expected a Zod schema"_.

> _note:_ `contract` requires a `static schema` that is a **`Zod` v4+ `z.object`**. It throws a `ConstraintError` if the schema is absent, is `Joi`/`Yup` (only `Zod` can carry the json-schema identity pragma), is `Zod` v3 (the pragma is stamped through `.meta()`, which v4 introduced), or is not object-shaped. It is memoized per-class, so repeated access returns the same instance.

> ⚠️ **a tree-shaped dobj needs `z.lazy()`.** A dobj whose schema references *itself* (`Comment` with `replies: Comment[]`, `Category` with `children`) cannot call `X.contract()` directly inside its own `static schema` - per JS class-field evaluation order the field is not assigned yet at that moment, so the call throws _"requires a static schema"_. Defer it:
>
> ```ts
> class Comment extends DomainEntity<Comment> implements Comment {
>   public static primary = ['uuid'] as const;
>   public static nested = { replies: Comment };
>   public static schema = z.object({
>     uuid: z.string().optional(),
>     text: z.string(),
>     replies: z.array(z.lazy(() => Comment.contract())),  // ✅ deferred to first parse / emit
>   });
> }
> ```
>
> Both concerns then work: `.parse()` hydrates recursively (instances all the way down), and `z.toJSONSchema(..., { io: 'input' })` emits the recursion as `{ "$ref": "#" }` with the pragma intact. The error message names this fix, so a first encounter corrects itself.

> ⚠️ **the schema must be a `z.object`, not a scalar.** A contract **coerces** - its decode ends in `X.build(props)`, and a domain object is a record of named props by construction. A scalar schema carries no named props, so a `z.string()` dobj given `'thruster'` would construct `{ "0":"t", "1":"h", "2":"r", ... }`: an object with `instanceof X === true` whose every field is a character index, with no throw and no `Zod` issue. It fails loud at `X.contract()` instead. If a dobj genuinely models a scalar, wrap it - `z.object({ value: z.string() })`.

### ⚠️ upgrade from a prior version

`X.contract` used to **be** the schema. It is now a **function**, and the call is the boundary. Three call-site edits, all in one release, **all loud at compile time** - TypeScript names each one for you, so a caller cannot miss one and find out in production:

| before | now | why |
|---|---|---|
| `X.contract` | `X.contract()` | a property access cannot carry the subclass, so the position was typed `any`. The call names `X` |
| `X.contract.ref(by)` | `X.contract().ref(by)` | `.ref` moved onto the call, where it too can name `X` - it was `any` before |
| `X.contract.ref('ref')` | `X.contract().ref()` | the no-argument call **is** the union. The published pragma value is unchanged (`by: 'ref'`) |

Two more consequences of the move, which the compiler cannot point at for you:

- **a position now parses to an instance, not to a plain object.** That is the whole feature - but if you had code that read `event.surfer.someProp` off a bare bag, it now reads it off a live `X`, and `X`'s constructor runs (and may reject a payload the schema accepted, as a path-tagged `Zod` issue).
- **every `z.toJSONSchema` call needs `{ io: 'input' }`**, at **both** borders. The default (`io: 'output'`) asks for the instance side, which json-schema cannot represent, so it **throws**. One unconditional line in your emit helper.

The migration is mechanical:

```ts
// before
z.object({ surfer: Surfer.contract, rider: Surfer.contract.ref('primary') });
const published = z.toJSONSchema(schema);

// after
z.object({ surfer: Surfer.contract(), rider: Surfer.contract().ref('primary') });
const published = z.toJSONSchema(schema, { io: 'input' });
```

A bare `X.contract` left behind fails **loud** rather than degrades: TypeScript refuses `.parse` / `.ref` on it, and at runtime a `z.object` position that gets it throws _"expected a Zod schema"_.

example:

```ts
import { z } from 'zod';
import { DomainEntity } from 'domain-objects';

// declare a domain entity with keys + a zod schema
interface Seaturtle {
  uuid?: string;
  name: string;
  species: string;
}
class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
  public static primary = ['uuid'] as const;
  public static unique = ['name'] as const;
  public static alias = { singular: 'seaturtle', plural: 'seaturtles' };
  public static schema = z.object({
    uuid: z.string().optional(),
    name: z.string(),
    species: z.string(),
  });
}

// `.contract()` stamps identity onto the schema; embed it anywhere a zod schema goes
const wireSchema = z.object({ passenger: Seaturtle.contract() });

// ✨ concern 1, instantiation: a parse hands back a LIVE domain object, not a bag of props
const parsed = wireSchema.parse({ passenger: { name: 'Crush', species: 'green' } });
expect(parsed.passenger).toBeInstanceOf(Seaturtle); // typed as Seaturtle, with `.clone`

// 🔭 concern 2, introspection: the SAME declaration emits the plain wire shape + the pragma
const json = z.toJSONSchema(wireSchema, { io: 'input' });
expect(json.properties.passenger['x-domain-object']).toEqual({
  name: 'Seaturtle',
  kind: 'entity', // which base class it extends: entity | literal | event | object
  primary: ['uuid'],
  unique: ['name'],
  alias: { singular: 'seaturtle', plural: 'seaturtles' },
});
```

If the constructor rejects what the schema accepted (a stricter ctor, a nested hydration failure), the throw is **contained as a zod issue** rather than let loose from the parse - so a boundary has exactly one failure channel, and the message names the fix:

```ts
const result = wireSchema.safeParse({ passenger: { name: 'Crush', species: 'green' } });
result.success; // false
result.error.issues[0];
// {
//   code: 'custom',
//   path: ['passenger'],
//   message: 'Seaturtle.contract(): the props satisfied the schema, but `Seaturtle.build(props)`
//             threw — <cause>. fix: align `static schema` with what the constructor demands …',
// }
```

#### where a `contract()` position may sit

A `contract()` composes into every `Zod` combinator, in **one** exception:

| the position | parses to an instance | pragma sits on |
| --- | --- | --- |
| a field of a `z.object` | ✅ | the field node |
| `z.array(X.contract())` | ✅ each element | `items` |
| `X.contract().optional()` | ✅ | the field node |
| `X.contract().nullable()` | ✅ | `anyOf[0]` (see the callout above) |
| an arm of `z.union([...])` | ✅ the matched arm | each `anyOf[i]` |
| the value of `z.record(k, X.contract())` | ✅ each value | `additionalProperties` |
| a **field** of a `z.discriminatedUnion` arm | ✅ | the field node |
| ⛔ an **arm** of a `z.discriminatedUnion` | ❌ refuses at `.parse()` | each `oneOf[i]` |

> ⛔ **a bare `X.contract()` cannot be an ARM of a `z.discriminatedUnion`** - and the refusal is **deferred to `.parse()`**. The build succeeds and `z.toJSONSchema` emits a full `oneOf` with every pragma intact, so a check that stops at the emit reports a false green; only real traffic hits the refusal.
>
> ```ts
> // ⛔ builds fine, emits fine, refuses on the first request
> const bad = z.discriminatedUnion('kind', [Seaturtle.contract(), Dolphin.contract()]);
> bad.parse({ name: 'Crush' }); // ✋ Invalid discriminated union option at index "0"
>
> // ✅ nest the domain object as a FIELD of each arm, and declare the discriminator alongside it
> const good = z.discriminatedUnion('kind', [
>   z.object({ kind: z.literal('turtle'), rider: Seaturtle.contract() }),
>   z.object({ kind: z.literal('dolphin'), rider: Dolphin.contract() }),
> ]);
> good.parse({ kind: 'turtle', rider: { name: 'Crush' } }).rider; // ✅ a Seaturtle
> ```
>
> The cause is `Zod`'s own requirement, not a `domain-objects` choice: a discriminated union switches on a **literal** field, and a domain object's schema declares its own props rather than a discriminator. A plain `z.union` has no such requirement, which is why the row above it works - `z.union` tries each arm, so it needs no key to switch on. Reach for `z.union` when the arms are domain objects, and for `z.discriminatedUnion` when you own a `kind` field to switch on.

### the two borders

`io` names the **side** of the contract (wire vs instance). The **border** of an endpoint (request vs response) is a different axis, and the two do not line up - so **both** borders emit under `{ io: 'input' }`:

```ts
const contract = {
  input: z.object({ rider: Seaturtle.contract().ref() }),
  output: z.object({ trophy: SurfTrophy.contract() }),
};

z.toJSONSchema(contract.input, { io: 'input' }); // ✅ what the CALLER supplies
z.toJSONSchema(contract.output, { io: 'input' }); // ✅ what the ENDPOINT supplies back
z.toJSONSchema(contract.output, { io: 'output' }); // ⛔ throws — the out side is a class instance
```

The trap is that `{ io: 'output' }` on the **output** border reads natural and is wrong. The rule is blunt on purpose: **every emit, at every border, passes `{ io: 'input' }`** - one line in your emit helper, never a per-schema judgment. It is safe on a position with no coerce too (a `.ref()` is a plain pick, so both faces represent).

#### ⛔ there is no `z.encode` - use `.parse` at both borders

`contract()` ships as a `.transform()`, not a `z.codec`, so it has a forward direction only:

```ts
z.encode(Seaturtle.contract(), seaturtle); // ⛔ throws $ZodEncodeError — no backward direction
```

The reason is a dependency fact, not a design taste: `domain-objects` declares `zod` as a **devDependency** and imports it `import type` only, so `z.codec` - which needs a *value* import - is out of reach. What is reachable from your own schema instance is `.transform()`.

**So a consumer uses `.parse` at BOTH borders**, which is safe on two conditions this repo clamps:

| condition | why it holds |
| --------- | ------------ |
| decode is **idempotent** | a re-parse of an already-rich value converges to an equal value |
| the rich form is **wire-equivalent** | `JSON.parse(JSON.stringify(instance))` equals the wire - `.clone` is a function, and `JSON.stringify` skips functions |

```ts
const response = contract.output.parse({ trophy }); // ✅ an instance in, an equal instance out
JSON.stringify(response.trophy); // ✅ the same bytes as the plain form
```

The cost is one extra decode per response; the bytes are identical.

The pragma also carries a `kind` (`'entity'` | `'literal'` | `'event'` | `'object'`) so a consumer
picks the right base class to reconstruct the domain object. The full pragma shape is exported as the
`DomainObjectPragma` type, so every consumer speaks one shape instead of a local re-declaration:

```ts
import type { DomainObjectPragma } from 'domain-objects';

// the `x-domain-object` node comes off an untyped json-schema blob, so the cast is a
// boundary read - domain-objects ships the type, you own the node access
const pragma = json.properties.passenger['x-domain-object'] as DomainObjectPragma;
pragma.kind; // 'entity' | 'literal' | 'event' | 'object'
pragma.primary; // string[] | undefined  (undefined when the class declares no primary)
```

> ⚠️ **a `.nullable()` field moves the pragma one node down.** The direct lookup above is correct for a plain field and for `.optional()`, but **not** for `.nullable()`: `Zod` emits a nullable field as an `anyOf: [<the schema>, { type: 'null' }]`, so the pragma rides on `anyOf[0]` and the direct read returns `undefined` - silently, with no error at compile, build, or parse.
>
> ```ts
> const json = z.toJSONSchema(z.object({ sponsor: Surfboard.contract().nullable() }), { io: 'input' });
>
> json.properties.sponsor['x-domain-object'];           // ⚠️ undefined
> json.properties.sponsor.anyOf[0]['x-domain-object'];  // ✅ { name: 'Surfboard', kind: 'literal' }
> ```
>
> | at the field | where the pragma sits |
> | --- | --- |
> | `X.contract()` | directly on the node |
> | `X.contract().optional()` | directly on the node |
> | `X.contract().nullable()` | on `anyOf[0]` |
> | `z.array(X.contract())` | on `items` |
>
> This is `Zod`'s own json-schema shape, not a `domain-objects` choice - the same relocation happens to any `.describe()` or other metadata on a nullable field. **A consumer that walks the document node-by-node (as a codegen does) is unaffected**, since it visits the `anyOf` arm like any other node; only a hand-written direct lookup needs the extra hop. Prefer a walk over a hardcoded path.

For a domain object with `nested` declarations, the contract carries the nested identities by **name** (the array form maps to an array of names, for polymorphic choices):

```ts
class Wave extends DomainEntity<Wave> implements Wave {
  public static primary = ['uuid'] as const;
  public static nested = { surfer: [Seaturtle, Dolphin] }; // polymorphic
  public static schema = z.object({ /* ... */ });
}

z.toJSONSchema(Wave.contract(), { io: 'input' })['x-domain-object'].nested;
// => { surfer: ['Seaturtle', 'Dolphin'] }
```

### method `contract().ref(by?)`

`contract()` carries the **whole** domain object. `contract().ref(by?)` carries only its **key** - a schema-level _reference_ to the domain object, stamped with an `x-domain-object-ref` pragma.

Where `.contract()` embeds the full domain object (composition), `.contract().ref(by?)` returns a `Zod` schema of ONLY the referenced key fields - the wire form of a field that _points at_ another domain object by key, rather than one that carries the whole object. It is the schema-level counterpart of the `RefByPrimary` / `RefByUnique` TypeScript types (which are erased at runtime): the reference relationship those types express now survives `z.toJSONSchema()`.

The `by` argument names which key(s) the reference carries:

- **`.ref()`** (no argument) - a `z.union` of whichever grains the class declares. **This is the default form**: a caller that merely means _"a reference"_ says so, and either key satisfies it. A class that declares only one grain degrades to that single grain (no pointless union). The `x-domain-object-ref` pragma is stamped once on the union's top node (the json-schema `anyOf` node), not on each arm - so a consumer that walks `anyOf` reads one pragma at the top, not one per branch. It still stamps `by: 'ref'`
  - ⚠️ **`.ref('ref')` is refused**, at both surfaces: TypeScript rejects the argument, and the runtime throws a `ConstraintError` that names the fix. `'ref'` remains the **published pragma value** (`by: 'ref'`) and the internal normalized value - what is refused is a caller who supplies it. Call `.ref()` with no argument
- `by: 'primary'` - picks the `static primary` fields. Always a flat pick: primary keys are flat identifiers (e.g. `uuid`), never nested domain objects
- `by: 'unique'` - picks the `static unique` fields. A unique key that is itself a domain object recurses to that dobj's own `.contract().ref('unique')` (to mirror `refByUnique`); if that nested domain object declares no `static unique`, its whole key sub-schema is embedded flat instead (no recursion, no throw) - the normal shape for a `DomainLiteral` unique key. A **polymorphic** unique key (an array of dobj choices) where any choice declares `static unique` throws a `ConstraintError` - the schema cannot know which arm a live value is, so it fails loud rather than embed a shape that would drift from `refByUnique`

> _note:_ **every key a ref names is REQUIRED**, on **both** grains, even when the source schema declares it `.optional()` (a `uuid` commonly is, since the db generates it). A reference that names no key is not a reference: `.ref('primary')` **rejects** a payload with no `uuid`, and `.ref()` **falls back to the unique arm** rather than succeed vacuously with `{}`.
>
> The three surfaces that describe one reference all say this, so none of them can disagree:
>
> | | the type | the ctor | the schema |
> | --- | --- | --- | --- |
> | **primary** | `RefByPrimary<X>` = `Required<Pick<…>>` | `refByPrimary()` throws on `undefined` | `.ref('primary')` rejects |
> | **unique** | `RefByUnique<X>` = `Required<Pick<…>>` | `refByUnique()` throws on `undefined` | `.ref('unique')` rejects |
>
> ⚠️ **a break in backcompat:** the `unique` row is new. `RefByUnique<X>` was a bare `Pick` (so an optional key stayed optional), and `refByUnique()` assigned `undefined` in silence. Both now match their `primary` twins. If you declare a `static unique` key whose schema field is `.optional()`, either make it required or reference that dobj by its primary key instead - a unique key that may be absent identifies nobody.

> _note:_ a **full domain object** at a ref position is pruned to its key, natively, with no error - so you can hand `.ref()` a live instance and get back the reference. When both keys are present, `.ref()` takes the **primary** arm.

> _note:_ call `.ref(by?)` on the RAW `.contract()`, before any other `Zod` chain op. Ops like `.optional()` / `.nullable()` return a fresh schema WITHOUT `.ref`, so `X.contract().optional().ref('primary')` fails. Embed the ref first, then chain: `z.object({ rider: X.contract().ref('primary') }).optional()`.

example:

```ts
// a field that references another domain object by key (not by value)
const trophySchema = z.object({
  uuid: z.string(),
  rider: Seaturtle.contract().ref('primary'), // => { uuid }, "references Seaturtle by primary"
  shaper: Seaturtle.contract().ref(), // => { uuid } | { name }, "references Seaturtle by either"
});

// the reference identity survives json-schema serialization
const json = z.toJSONSchema(trophySchema, { io: 'input' });
expect(json.properties.rider['x-domain-object-ref']).toEqual({
  of: 'Seaturtle', // which domain object it references
  by: 'primary', // which key(s) the reference carries
});
```

The ref pragma shape is exported as the `DomainObjectPragmaRef` type - the partner to `DomainObjectPragma`:

```ts
import type { DomainObjectPragmaRef } from 'domain-objects';

// the `x-domain-object-ref` node comes off an untyped json-schema blob, so the cast is a
// boundary read - domain-objects ships the type, you own the node access
const refPragma = json.properties.rider['x-domain-object-ref'] as DomainObjectPragmaRef;
refPragma.of; // string - the referenced domain object's class name
refPragma.by; // 'primary' | 'unique' | 'ref'
```


## Readonly vs Metadata Properties

Domain objects support two categories of readonly properties. Both are set by the persistence layer, but they differ in what they describe. **Metadata is a special subset of readonly** - all metadata is readonly, but not all readonly is metadata.

### Metadata Properties (Persistence Descriptors - All Domain Objects)

**Metadata** are attributes set by the persistence layer that describe the persistence of the object - not intrinsic attributes of the domain object itself. This is the most common type of readonly property and applies to **all domain objects** (entities, events, and literals).

- Default metadata keys: `id`, `uuid`, `createdAt`, `updatedAt`, `effectiveAt`
- Customize via `static metadata = ['...'] as const;`
- Omit with `omitMetadata(obj)`

```ts
class User extends DomainEntity<User> implements User {
  public static primary = ['id'] as const;
  public static unique = ['email'] as const;
  public static metadata = ['id', 'createdAt', 'updatedAt'] as const;
}
```

### Readonly Properties (Intrinsic Attributes Set by Persistence - Entities Only)

**Readonly** (non-metadata) are intrinsic attributes of the object that the persistence layer sets. Unlike metadata (which describes the persistence), these describe real attributes of the domain object.

- Only applicable to **DomainEntity** (not DomainEvent or DomainLiteral)
- No default readonly keys (domain-specific, must be explicitly declared)
- Declare via `static readonly = ['...'] as const;`
- Omit with `omitReadonly(obj)` - this omits **both** metadata AND explicit readonly keys

**Why only DomainEntity?**
- **DomainEvent**: Immutable by nature. All properties are known before persistence - there's no concept of persistence-layer-set intrinsic attributes.
- **DomainLiteral**: Immutable by nature and fully defined by intrinsic properties. If a property changes, it's a different literal.

```ts
class AwsRdsCluster extends DomainEntity<AwsRdsCluster> implements AwsRdsCluster {
  public static primary = ['arn'] as const;
  public static unique = ['name'] as const;
  public static metadata = ['arn'] as const;                    // AWS-assigned identity (describes persistence)
  public static readonly = ['host', 'port', 'status'] as const; // AWS-resolved intrinsic attributes (describes the object)
}
```

### Key Distinction

| Aspect | Metadata | Readonly (broader) |
|--------|----------|----------|
| Relationship | A special **subset of** readonly | The **superset** containing metadata + more |
| Applies to | All domain objects | DomainEntity only |
| What it describes | Persistence of the object | Intrinsic attributes of the object |
| Set by | Persistence layer | Persistence layer |
| Default keys | Yes (`id`, `uuid`, etc.) | No (explicit only) |
| Omit function | `omitMetadata()` | `omitReadonly()` (includes metadata) |

### Nested Readonly Properties (dot-path, declared from the entity)

Some persistence-set attributes belong, by domain, inside a nested sub-object. For example, a `SeaTurtle` carries a satellite tracker — in real sea-turtle telemetry, a **Platform Terminal Transmitter (PTT)**. Once it is registered with the **Argos** satellite system, that system assigns the `argosId` and records each `lastFixAt` (location fix). The researcher-applied `flipperTagId` (a flipper tag) is settable; the Argos-resolved fields are readonly:

```ts
// a stateless, reusable satellite tracker (PTT) literal — it cannot self-declare readonly
interface SatelliteTracker {
  active: boolean;   // settable by the researcher
  argosId?: string;  // assigned by the Argos satellite system (readonly)
  lastFixAt?: string; // last Argos location fix (readonly)
}
class SatelliteTracker
  extends DomainLiteral<SatelliteTracker>
  implements SatelliteTracker {}

interface TurtleGear {
  flipperTagId: string; // researcher-applied flipper tag (settable)
  tracker: SatelliteTracker;
}
class TurtleGear extends DomainLiteral<TurtleGear> implements TurtleGear {
  public static nested = { tracker: SatelliteTracker };
}

class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
  public static unique = ['seawaterSecurityNumber'] as const;
  public static metadata = ['uuid'] as const;
  public static readonly = [
    'gear.tracker.argosId',   // nested, Argos-resolved
    'gear.tracker.lastFixAt', // nested, Argos-resolved
  ] as const;
  public static nested = { gear: TurtleGear };
}
```

Declare nested readonly attributes via **dot-path** keys in `static readonly`. The attribute access chain (`gear.tracker.argosId`) is followed from the entity down into the nested object.

**Why declare it on the entity (not the nested literal)?** A `DomainLiteral` is stateless and reusable across domains — in one domain `argosId` may be user-supplied, in another Argos-resolved. So the literal cannot self-declare readonly; the **entity** owns which of its nested attributes are persistence-set.

Behavior:
- `omitReadonly(obj)` follows each dot-path and drops the nested readonly field as it recurses into nested objects.
- When a path traverses an **array** of nested objects (e.g. `sensors.calibratedAt`), it applies to **every element**.
- The sub-objects along the path must be declared in `static nested` (so they hydrate into `DomainObject` instances the path can follow).
- `hasReadonly({ of: Entity })(obj)` verifies nested readonly fields are populated at runtime, via a walk of the dot-path (and every array element).

Requirements & limits:
- **A nested readonly field must be optional in its literal's schema.** `omitReadonly` reconstructs each object after omission (it re-runs schema validation), so a nested readonly field marked _required_ in the literal's schema would fail reconstruction.
- **Type-level narrow is flat-only.** `HasReadonly<typeof Entity>` narrows flat metadata/readonly keys to required; nested dot-path keys are verified at runtime by `hasReadonly` but are **not** narrowed at the type level (they are gracefully ignored by the type).

```ts
const omitted = omitReadonly(turtle);
omitted.gear.tracker.argosId; // undefined (nested readonly dropped)
omitted.gear.tracker.active;  // preserved (settable)
```


## `DomainObject.build`

Add getters to your domain object instances, easily.

By default, .build will wrap your dobj instances `withImmute`, to give you immute operations such as `.clone(andSet?: Partial<T>)`

For example,
```ts
const ship = RocketShip.build({
  serialNumber: 'SN1',
  fuelQuantity: 9001,
  passengers: 3,
});
const shipTwin = ship.clone()
const shipUsed = ship.clone({ fuelQuantity: 821 })
```

Note, you can override your DomainObject's .build procedure to add your own getters

For example,
```ts

```

This gives you a simple way to enrich your objects with domain-specific logic, while still preserving immutability and ergonomics.

## `withImmute`


Wraps any domain object to make it safer to use via immutable operations.

Immutability helps avoid bugs caused by shared object references - where multiple procedures unintentionally share the same instance of data in memory. This is especially common concern in systems which leverage parallelism.

`withImmute` adds immute operators to your dobj, such as
- `.clone(update?: Partial<T>)`

Added by default via `.build()`. Available for adhoc usage too:

```ts
const plant = withImmute(new Plant({ ... }));
const twin = plant.clone()
```

## `withImmute.clone(update?: Partial<T>)`

Creates a new instance of the domain object with updated values — without modifying the original.

This is helpful when working in a system that depends on immutability, such as functional logic, undo/redo flows, or parallel processing, where unintended mutations can introduce bugs.

The `.clone()` method uses deep cloning and deep merging:
- Every nested value is safely copied.
- Only the fields you provide in the `update` are changed.
- Original object remains untouched.

Example:

```ts
const plant = Plant.build({
  plantedIn: new PlantPot({ diameterInInches: 5 }),
  lastWatered: 'Monday',
});

const updated = plant.clone({ lastWatered: 'Tuesday' });

expect(updated.lastWatered).toEqual('Tuesday');
expect(plant.lastWatered).toEqual('Monday'); // original is unchanged
```
