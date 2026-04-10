# self-review r8: has-consistent-mechanisms

## extant recursive traversal patterns in codebase

the codebase has two established recursive traversal patterns in the serde module:

### serialize.ts pattern

```ts
const toSerializable = (value, options) => {
  // literal → return value
  if (!Array.isArray(value) && typeof value !== 'object') return value;
  // null → return null
  if (value === null) return null;
  // array → map recursively
  if (Array.isArray(value)) return value.map((el) => toSerializable(el, options));
  // object → toSerializableObject
  return toSerializableObject(value, options);
};

const toSerializableObject = (obj, options) => {
  // domain object → handle specially
  if (isOfDomainObject(obj)) { /* special handle */ }
  // traverse keys
  Object.keys(obj).forEach((key) => {
    stringifiableObj[key] = toSerializable(obj[key], options);
  });
};
```

### deserialize.ts pattern

```ts
const toHydrated = (value, context) => {
  // literal → return value
  if (!Array.isArray(value) && typeof value !== 'object') return value;
  // null → return null
  if (value === null) return null;
  // array → map recursively
  if (Array.isArray(value)) return value.map((el) => toHydrated(el, context));
  // object → toHydratedObject
  return toHydratedObject(value, context);
};

const toHydratedObject = (obj, context) => {
  // domain object → handle specially and return
  if (obj._dobj) { /* instantiate and return */ }
  // traverse keys
  Object.keys(obj).forEach((key) => {
    hydratedObj[key] = toHydrated(obj[key], context);
  });
};
```

---

## blueprint's new mechanism

### applyWithImmuteToTree

```ts
const applyWithImmuteToTree = <T>(value: T): T => {
  // domain object → apply withImmute, recurse into properties
  if (isOfDomainObject(value)) {
    withImmute(value as Record<string, any>);
    Object.keys(value as object).forEach((key) => {
      applyWithImmuteToTree((value as Record<string, any>)[key]);
    });
    return value;
  }
  // array → recurse into elements
  if (Array.isArray(value)) {
    value.forEach(applyWithImmuteToTree);
    return value;
  }
  // plain object → recurse into keys
  if (typeof value === 'object' && value !== null) {
    Object.keys(value).forEach((key) => {
      applyWithImmuteToTree((value as Record<string, any>)[key]);
    });
  }
  return value;
};
```

---

## consistency check

### does it follow the extant pattern?

| aspect | extant pattern | blueprint pattern | match? |
|--------|---------------|-------------------|--------|
| literal check | return early | return early | yes |
| null check | return null | return value (null passes through) | yes |
| array handle | map/forEach recursively | forEach recursively | yes |
| domain object | special handle | special handle (apply withImmute) | yes |
| key traversal | Object.keys().forEach() | Object.keys().forEach() | yes |

**why the pattern is consistent**: `applyWithImmuteToTree` uses the same structural approach as `toSerializable` and `toHydrated`. the only difference is what it does at each node — instead of transform for serialization or hydrate from JSON, it applies `withImmute`.

### does it reuse extant utilities?

| utility | source | reused? |
|---------|--------|---------|
| `isOfDomainObject` | `@src/instantiation/inherit/isOfDomainObject` | yes |
| `withImmute` | `@src/manipulation/immute/withImmute` | yes |
| `WithImmute` type | `@src/manipulation/immute/withImmute` | yes |

**why no duplication**: the blueprint imports and reuses all extant utilities for domain object detection and immute wrap. no new detection or wrap logic is introduced.

### could we reuse an extant component instead?

**question**: could we use `toHydrated` to apply withImmute?

**answer**: no. `toHydrated` operates on raw JSON parsed data (plain objects with `_dobj` markers). by the time we need to apply `withImmute`, the domain objects are already instantiated. the traversal target is different:

- `toHydrated`: traverses JSON → creates instances
- `applyWithImmuteToTree`: traverses instances → wraps with `.clone()`

these are distinct phases with distinct input shapes.

**question**: could we add withImmute inside `toHydratedObject` inline?

**answer**: that would only wrap the top-level object. nested domain objects are created inside the constructor by `hydrateNestedDomainObjects`, not by `toHydratedObject`. we need a separate post-hydration traversal.

---

---

## why each non-issue holds

### non-issue 1: pattern consistency holds

**claim**: the new `applyWithImmuteToTree` follows the extant recursive traversal pattern.

**why it holds**:

the codebase's recursive traversal pattern (seen in both `toSerializable` and `toHydrated`) has a specific shape:

1. **type dispatch at top**: check literal, null, array BEFORE object
2. **early returns**: each type check returns or delegates immediately
3. **domain object special case**: check `isOfDomainObject()` or `obj._dobj` first
4. **key traversal via forEach**: use `Object.keys().forEach()` not `for...in`

evidence from serialize.ts line 66-98:
```ts
const toSerializable = (value, ...) => {
  if (!Array.isArray(value) && typeof value !== 'object') return value;  // 1. literal
  if (value === null) return null;                                        // 2. null
  if (Array.isArray(value)) return value.map(...);                       // 3. array
  return toSerializableObject(value, ...);                               // 4. object
};
```

evidence from deserialize.ts line 62-77:
```ts
const toHydrated = (value, ...) => {
  if (!Array.isArray(value) && typeof value !== 'object') return value;  // 1. literal
  if (value === null) return null;                                        // 2. null
  if (Array.isArray(value)) return value.map(...);                       // 3. array
  return toHydratedObject(value, ...);                                   // 4. object
};
```

the blueprint's `applyWithImmuteToTree` follows the same shape:
```ts
const applyWithImmuteToTree = <T>(value: T): T => {
  if (isOfDomainObject(value)) { /* domain object */ }  // 1. domain check first
  if (Array.isArray(value)) { /* array */ }             // 2. array
  if (typeof value === 'object' && value !== null) { /* object */ }  // 3. plain object
  return value;                                         // 4. passthrough
};
```

the order differs slightly (domain object first vs last), but this is intentional: `applyWithImmuteToTree` wants to wrap domain objects AND recurse into their properties, whereas `toHydrated` delegates domain objects to a separate handler that returns immediately.

---

### non-issue 2: utility reuse holds

**claim**: the blueprint reuses all extant utilities without creating new ones.

**why it holds**:

searched the codebase for domain object detection patterns:
- `isOfDomainObject` (15 files) — canonical check, uses `instanceof DomainObject`
- `isOfDomainEntity` — for entity-specific checks
- `isOfDomainLiteral` — for literal-specific checks
- `obj._dobj` — JSON marker for serialized domain objects

the blueprint uses `isOfDomainObject` because:
1. it operates on instantiated objects, not JSON (so `_dobj` marker is irrelevant)
2. it needs to detect any domain object, not just entities or literals

searched the codebase for immute patterns:
- `withImmute` (used in DomainObject.ts line 173, exported from index.ts line 38)
- no alternative immute utilities exist

the blueprint imports both from their canonical locations:
```ts
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';
import { withImmute, type WithImmute } from '@src/manipulation/immute/withImmute';
```

no new detection or immute logic is introduced.

---

### non-issue 3: no duplication holds

**claim**: the new helper does not duplicate extant functionality.

**why it holds**:

searched for extant tree traversal utilities:
- `grep -r "traverse|walk|visit|tree" src/` → only found comments, no utility functions

searched for extant "apply to all nested" utilities:
- `grep -r "forEach.*key|each.*key" src/` → found only inline traversals in serialize/deserialize

the codebase has NO generic "apply function to all nested domain objects" utility. each serde function has its own inline traversal because the operation at each node differs:
- serialize: convert to JSON-serializable form
- deserialize: hydrate from JSON

adding a generic utility would require abstraction over the "what to do" part, which would add complexity without benefit for a single use case.

**conclusion**: creating `applyWithImmuteToTree` as a local helper is consistent with the codebase's pattern of inline traversals for specific purposes.

---

### non-issue 4: component reuse evaluated holds

**claim**: we evaluated whether extant components could serve this purpose.

**why it holds**:

**evaluated `toHydrated`**:
- `toHydrated` operates on `Record<string, any>` from `JSON.parse()`
- it checks for `obj._dobj` marker to identify domain objects
- it calls `new DomainObjectConstructor(obj)` to create instances
- by contrast, `applyWithImmuteToTree` operates on already-instantiated domain objects
- these are different phases with different input types — cannot reuse

**evaluated `toHydratedObject`**:
- adds `withImmute` call inside `toHydratedObject` at line 106 would only wrap top-level object
- nested domain objects are created by `hydrateNestedDomainObjects` inside the constructor
- `toHydratedObject` never sees the nested instances — it returns after calling constructor
- evidence from deserialize.ts line 106: `return new DomainObjectConstructor(obj, ...);`
- therefore, inline modification cannot achieve recursive wrap

**evaluated creating shared utility**:
- single use case (deserialize) does not justify abstraction
- rule.prefer.wet-over-dry: wait for 3+ usages before extract
- if future use cases emerge, the helper can be promoted

---

## conclusion

| check | status | why it holds |
|-------|--------|--------------|
| follows extant pattern | yes | same type dispatch, early return, forEach traversal |
| reuses extant utilities | yes | imports canonical isOfDomainObject, withImmute |
| avoids duplication | yes | no extant tree traversal utility; inline is the pattern |
| component reuse evaluated | yes | toHydrated operates on JSON, not instances; inline mod insufficient |

**status**: no issues found — blueprint is consistent with extant mechanisms
