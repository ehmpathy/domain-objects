# self-review r9: has-consistent-conventions

## extant name conventions in codebase

### public function names (manipulation/)

| name | pattern | action |
|------|---------|--------|
| `serialize` | verb | convert to string |
| `deserialize` | verb | convert from string |
| `getUniqueIdentifier` | get + noun | retrieve property |
| `getPrimaryIdentifier` | get + noun | retrieve property |
| `getUpdatableProperties` | get + noun | retrieve properties |
| `getMetadataKeys` | get + noun | retrieve keys |
| `getReadonlyKeys` | get + noun | retrieve keys |
| `clone` | verb | create copy |
| `dedupe` | verb | remove duplicates |
| `omitMetadata` | verb + noun | filter out |
| `omitReadonly` | verb + noun | filter out |
| `hasReadonly` | has + noun | check presence |
| `withImmute` | with + noun | wrap object |

**pattern observed**:
- public functions use `verb` or `verb+noun` or `get+noun` or `with+noun`
- no `apply*` pattern in public functions

### private function names (serde/)

| name | pattern | action |
|------|---------|--------|
| `toSerializable` | to + adjective | transform value |
| `toSerializableObject` | to + adjective + noun | transform object |
| `toHydrated` | to + adjective | transform value |
| `toHydratedObject` | to + adjective + noun | transform object |

**pattern observed**:
- private functions use `to*` prefix for transformations
- `to*Object` suffix for object-specific variants

---

## blueprint's proposed name

### `applyWithImmuteToTree`

**analysis**:

| aspect | extant pattern | proposed | match? |
|--------|---------------|----------|--------|
| prefix | `to*` for transformations | `apply*` | no |
| structure | `to + adjective + Object` | `apply + verb + noun + To + noun` | no |

**question**: is `apply*` appropriate here?

**reasoning**:

the `to*` functions do transformations: they take input and return transformed output.
- `toSerializable(value)` → returns serializable form
- `toHydrated(value)` → returns hydrated form

`applyWithImmuteToTree` is different:
- it mutates in place (adds `.clone` property via Object.defineProperty)
- it returns the same object reference (not a new transformed form)
- it's an applicator, not a transformer

the `with*` pattern is used for wrap:
- `withImmute(obj)` → returns obj with `.clone` added (in place)

**alternative names considered**:

| name | pros | cons |
|------|------|------|
| `applyWithImmuteToTree` | clear intent, matches action | doesn't follow `to*` pattern |
| `toWithImmuted` | follows `to*` pattern | awkward ("WithImmuted" isn't a word) |
| `toImmuteWrapped` | follows `to*` pattern | confuses "wrap" with value wrap vs property add |
| `withImmuteRecursive` | follows `with*` pattern | `withImmute` already exists, confusion |
| `hydrateWithImmute` | matches "hydrate" context | but this isn't hydration, it's post-hydration |

**decision**: `applyWithImmuteToTree` is acceptable because:
1. the action IS an application, not a transformation
2. it clearly describes what it does: applies `withImmute` to a tree
3. it's a private function, not a public function (less convention pressure)
4. the alternative `to*` names are worse (awkward or confusing)

---

## other name choices in blueprint

### return type: `WithImmute<T>`

**convention check**: already extant, defined in `withImmute.ts` line 1-6

**match**: yes — reuses extant type name

### import: `isOfDomainObject`

**convention check**: already extant, used in 15 files

**match**: yes — reuses extant function name

### export: `WithImmute` type from index.ts

**convention check**: other types are exported from index.ts (line 1-50)

**match**: yes — follows extant export pattern

---

---

## codebase search evidence

### search 1: public function names

```
grep "^export const [a-z]" src/manipulation/
```

results found:
- serialize.ts:50 — `export const serialize`
- deserialize.ts:22 — `export const deserialize`
- getUniqueIdentifier.ts:21 — `export const getUniqueIdentifier`
- getPrimaryIdentifier.ts:20 — `export const getPrimaryIdentifier`
- clone/clone.ts:16 — `export const clone`
- dedupe.ts:29 — `export const dedupe`
- omitMetadata.ts:43 — `export const omitMetadata`
- omitReadonly.ts:47 — `export const omitReadonly`
- hasReadonly.ts:44 — `export const hasReadonly`
- withImmute.ts — exports `withImmute`

**observation**: all public functions use verb-based names. no `apply*` prefix found.

### search 2: private function names in serde

```
grep "^const [a-z].*= .*=>" src/manipulation/serde/
```

results found:
- serialize.ts:66 — `const toSerializable`
- serialize.ts:105 — `const toSerializableObject`
- deserialize.ts:62 — `const toHydrated`
- deserialize.ts:84 — `const toHydratedObject`

**observation**: all private serde functions use `to*` prefix.

### search 3: any apply* pattern

```
grep -r "apply" src/
```

results found: none in function names, only in test comments

**observation**: `apply*` is not an extant naming pattern in this codebase.

---

## why each non-issue holds

### non-issue 1: `applyWithImmuteToTree` divergence is acceptable

**claim**: the name diverges from `to*` pattern but is acceptable.

**why it holds**:

1. **semantic accuracy**: the function applies a mutation, not transforms to new form

   evidence from serialize.ts:66-98:
   ```ts
   const toSerializable = (value, options): any => {
     // returns NEW object: stringifiableObj
     return toSerializableObject(value, options);
   };
   ```

   evidence from deserialize.ts:62-77:
   ```ts
   const toHydrated = (value, context): any => {
     // returns NEW object: either new DomainObjectConstructor() or hydratedObj
     return toHydratedObject(value, context);
   };
   ```

   contrast with applyWithImmuteToTree:
   ```ts
   const applyWithImmuteToTree = <T>(value: T): T => {
     withImmute(value);  // mutates in place via Object.defineProperty
     return value;       // returns SAME object reference
   };
   ```

   the `to*` pattern implies transformation to new form. this function mutates in place.

2. **private scope**: this is a module-private function, not exported

   evidence: the function is declared with `const` inside the module, not `export const`

   convention pressure is lower because:
   - consumers never see this name
   - only the deserialize.ts maintainers interact with it
   - readability within one file matters more than cross-file consistency

3. **alternatives are worse**: the `to*` alternatives evaluated are awkward

   | alternative | problem |
   |-------------|---------|
   | `toWithImmuted` | "WithImmuted" is not a word; past participle of "withImmute" unclear |
   | `toImmuteWrapped` | conflates "wrap" (value wrap) with "add property" |
   | `withImmuteRecursive` | collision with extant `withImmute`; unclear it's recursive |
   | `toImmutable` | misleading — doesn't make objects immutable, adds `.clone()` |

4. **precedent for `apply*`**: common pattern in JS ecosystem

   - `Function.prototype.apply()` — apply function to arguments
   - `Array.from().map()` style — "apply transformation to each"
   - React: `applyMiddleware()` — apply middleware to store
   - the name clearly states: "apply withImmute to tree structure"

### non-issue 2: all other names follow extant conventions

**claim**: return type, imports, and exports follow extant conventions.

**why it holds**:

1. **`WithImmute<T>` type**: already extant at `withImmute.ts` line 1-6

   evidence from withImmute.ts:
   ```ts
   export type WithImmute<T> = T & {
     clone: (updates?: Partial<T>) => WithImmute<T>;
   };
   ```

   the blueprint reuses this exact type, no new type introduced.

2. **`isOfDomainObject`**: canonical detection function, used in 15 files

   search evidence:
   ```
   grep -l "isOfDomainObject" src/
   ```

   found in: serialize.ts, dedupe.ts, getMetadataKeys.ts, getPrimaryIdentifier.ts, getReadonlyKeys.ts, getUniqueIdentifier.ts, getUpdatableProperties.ts, hasReadonly.ts, omitMetadata.ts, omitReadonly.ts, hydrateNestedDomainObjects.ts, assertDomainObjectIsSafeToManipulate.ts, isOfDomainObject.ts, isOfDomainObject.test.ts, index.ts

   the blueprint imports this same function — no new detection function introduced.

3. **type export in index.ts**: follows extant pattern

   evidence from index.ts lines 1-50:
   ```ts
   export { DomainEntity } from './instantiation/DomainEntity';
   export { DomainLiteral } from './instantiation/DomainLiteral';
   export { DomainObject } from './instantiation/DomainObject';
   // ... many type exports
   export type { HasMetadata } from './manipulation/HasMetadata.type';
   export type { HasReadonly } from './manipulation/HasReadonly.type';
   ```

   the blueprint adds:
   ```ts
   export type { WithImmute } from './manipulation/immute/withImmute';
   ```

   this follows the extant pattern of `export type { TypeName } from './path'`.

**conclusion**: no new names introduced — all names are exact reuses of extant names in the codebase.

---

## conclusion

| name | convention | status |
|------|------------|--------|
| `applyWithImmuteToTree` | diverges from `to*` | acceptable — semantic accuracy over pattern conformity |
| `WithImmute<T>` | reuses extant | match |
| `isOfDomainObject` | reuses extant | match |
| export in index.ts | follows extant | match |

**status**: one divergence found (`apply*` vs `to*`) but determined acceptable. all other names match extant conventions.
