# review.self: has-consistent-mechanisms (r3)

## deep review

read line-by-line through extant traversal patterns in the codebase.

## extant patterns analyzed

### serialize.ts: `toSerializable` (lines 66-98)

```ts
const toSerializable = (value: any, ...): any => {
  // literal check
  if (!Array.isArray(value) && typeof value !== 'object') return value;
  // null check
  if (value === null) return null;
  // array check
  if (Array.isArray(value)) return value.map((el) => toSerializable(el, ...));
  // object -> delegate to toSerializableObject
  return toSerializableObject(value, ...);
};
```

### serialize.ts: `toSerializableObject` (lines 105-137)

```ts
const toSerializableObject = (obj: Record<string, any>, ...) => {
  const result: Record<string, any> = {};
  if (isOfDomainObject(obj)) stringifiableObj._dobj = obj.constructor.name;
  // ...
  Object.keys(obj).sort().forEach((key) => {
    result[key] = toSerializable(obj[key], ...);
  });
  return result;
};
```

### deserialize.ts (extant): `toHydrated` (lines 96-111)

```ts
const toHydrated = (value: any, context: ...): any => {
  // literal check
  if (!Array.isArray(value) && typeof value !== 'object') return value;
  // null check
  if (value === null) return null;
  // array check
  if (Array.isArray(value)) return value.map((el) => toHydrated(el, context));
  // object -> delegate to toHydratedObject
  return toHydratedObject(value, context);
};
```

## my implementation: `withImmute.recursive` (withImmute.ts:34-56)

```ts
const recursive = <T>(value: T): WithImmute<T> => {
  // apply to domain objects
  if (isOfDomainObject(value)) {
    singular(value as Record<string, any>);
    // recurse into properties for nested domain objects
    Object.keys(value as object).forEach((key) => {
      recursive((value as Record<string, any>)[key]);
    });
    return value as WithImmute<T>;
  }
  // recurse into arrays
  if (Array.isArray(value)) {
    value.forEach(recursive);
    return value as WithImmute<T>;
  }
  // recurse into plain objects
  if (typeof value === 'object' && value !== null) {
    Object.keys(value).forEach((key) => {
      recursive((value as Record<string, any>)[key]);
    });
  }
  return value as WithImmute<T>;
};
```

## pattern comparison

| pattern | serialize.ts | deserialize.ts (extant) | withImmute.recursive |
|---------|--------------|------------------------|----------------------|
| literal passthrough | yes | yes | yes (implicit) |
| null check | explicit | explicit | inline in object check |
| array recurse | `.map()` | `.map()` | `.forEach()` |
| object recurse | `Object.keys().forEach()` | `Object.keys().forEach()` | `Object.keys().forEach()` |
| dobj detection | `isOfDomainObject()` | `obj._dobj` check | `isOfDomainObject()` |

## difference: array traversal method

extant code uses `.map()` for arrays (returns new array).
my code uses `.forEach()` for arrays (mutates in place).

**why this is correct:**
- serialize/deserialize need to return new values, hence `.map()`
- `withImmute.recursive` mutates in place via `Object.defineProperty`, hence `.forEach()`
- the return type matches input type - no new allocation needed
- `withImmute.singular` adds a property to extant objects, not new object creation

## issues found

none. the different array method (`.forEach()` vs `.map()`) is intentional due to mutation semantics.

## why it holds

1. uses `isOfDomainObject()` - the canonical type guard in this codebase
2. uses `Object.keys().forEach()` - the extant traversal pattern
3. uses `.forEach()` for arrays because mutation happens in place
4. lives in `withImmute.ts` alongside the original `singular` implementation - coherent module
