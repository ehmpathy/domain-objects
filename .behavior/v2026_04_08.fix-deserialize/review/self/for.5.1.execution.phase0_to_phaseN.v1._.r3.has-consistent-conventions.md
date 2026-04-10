# review.self: has-consistent-conventions (r3)

## review scope

check if new names follow extant conventions.

## extant name patterns

### public functions

| name | pattern |
|------|---------|
| `getUpdatableProperties` | `get` + noun |
| `getReadonlyKeys` | `get` + noun |
| `getUniqueIdentifier` | `get` + noun |
| `omitMetadata` | `omit` + noun |
| `omitReadonly` | `omit` + noun |
| `hasReadonly` | `has` + noun |

### file-local transformation functions

| name | pattern |
|------|---------|
| `toSerializable` | `to` + adjective |
| `toSerializableObject` | `to` + adjective + noun |
| `toHydrated` | `to` + adjective |
| `toHydratedObject` | `to` + adjective + noun |
| `toDedupeIdentity` | `to` + noun |
| `toVersionIdentity` | `to` + noun |

### file-local recursive functions

| name | pattern |
|------|---------|
| `recursivelyOmitMetadataFromObjectValue` | `recursively` + verb + scope |
| `recursivelyOmitReadonlyFromObjectValue` | `recursively` + verb + scope |

## my names: `withImmute.recursive`, `withImmute.singular`

pattern: `withImmute` + `.` + `variant`

**comparison with extant:**

extant `withImmute`:
- wrapped a single object with `.clone()` method
- was also exported as `withClone`

new variants:
- `withImmute.singular` - renamed original behavior (shallow)
- `withImmute.recursive` - new variant (tree traversal)
- `withImmute` (default) - now points to `recursive` for pit of success

**why this pattern?**

1. `withImmute.singular` - indicates it handles a single object
2. `withImmute.recursive` - indicates it traverses the tree
3. default behavior is `recursive` - pit of success for common case

## convention alignment check

| aspect | extant pattern | my choice |
|--------|---------------|-----------|
| camelCase | yes | yes |
| object variant pattern | `serialize` / `deserialize` | `withImmute.singular` / `withImmute.recursive` |
| default export | function | function with properties attached |

## issues found

none. the name pattern follows the pit-of-success where the default is recursive.

## why it holds

1. `singular` is a clear term - means "one item only"
2. `recursive` is a clear term - means "traverse the tree"
3. object with variants pattern is established in JS (e.g., `Object.assign` behavior)
4. camelCase names match all extant functions
