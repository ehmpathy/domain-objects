# domain-objects

![ci_on_commit](https://github.com/uladkasach/domain-objects/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/uladkasach/domain-objects/workflows/deploy_on_tag/badge.svg)

A simple, convenient way to represent domain objects and add runtime validation in your code base.

Guided by [Domain Driven Design](https://dddcommunity.org/learning-ddd/what_is_ddd/)

# Purpose

- promote speaking in a domain driven manner, in code and in speech, by formally defining domain objects
- support runtime validation of objects, for more reliable code

# Install

```sh
npm install --save domain-objects
```

# Examples

### value object

```ts
```

### entity

```ts
```

### runtime validation

# Usage

## instantiation

instantiate your domain objects

## run time validation

when you provide a schema in your type definition, your domain objects will now be run time validated at instantiation

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
