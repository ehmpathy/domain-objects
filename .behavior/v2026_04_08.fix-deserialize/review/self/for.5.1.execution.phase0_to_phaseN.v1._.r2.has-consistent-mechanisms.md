# review.self: has-consistent-mechanisms (r2)

## review scope

check if new mechanisms duplicate extant functionality.

## new mechanisms introduced

### 1. `withImmute.recursive` (withImmute.ts:34-56)

**does the codebase already have a mechanism that does this?**

no. searched for:
- recursive tree traversal utilities: none found
- domain object tree walkers: none found
- extant recursive `withImmute`: only `withClone` which is shallow

**does it duplicate extant utilities?**

no. each function that traverses domain objects uses its own inline approach:

| file | traversal pattern |
|------|-------------------|
| `serialize.ts` | `toSerializable` → `toSerializableObject` → recursive |
| `deserialize.ts` | `toHydrated` → `toHydratedObject` → recursive |
| `hydrateNestedDomainObjects.ts` | `Object.keys().forEach()` + inline callbacks |

**could we reuse an extant component?**

no shared tree traversal utility exists. the codebase pattern is:
- each function has its own inline traversal
- traversal is scoped to the file where needed

### 2. use of `.build()` instead of `new` (hydrateNestedDomainObjects.ts, deserialize.ts)

**does this duplicate extant mechanisms?**

no. this uses the extant `.build()` method already defined on `DomainObject`:
- `.build()` is already the recommended way to instantiate domain objects
- `.build()` already applies `withImmute`
- we now use it consistently throughout

**does it replace an extant pattern?**

yes. replaces `new Class(props)` with `Class.build(props)` at hydration points:
- hydrateNestedDomainObjects.ts:77
- hydrateNestedDomainObjects.ts:130
- deserialize.ts:117

this is consistent with the vision: "propagate .build() throughout".

## consistency analysis

| aspect | extant pattern | my implementation |
|--------|---------------|-------------------|
| type detection | `isOfDomainObject()` | `isOfDomainObject()` |
| traversal | `Object.keys().forEach()` | `Object.keys().forEach()` |
| instantiation | `.build()` is the recommended pattern | now used everywhere |
| idempotency | `withClone` has no idempotency check | `singular` now has idempotency check |

## issues found

none. mechanisms are consistent with extant patterns or extend them appropriately.

## conclusion

no mechanism duplication. the implementation:
1. extends `withImmute` with `.recursive` variant via extant traversal patterns
2. uses extant `.build()` method instead of a duplicate
