# self-review r3: has-questioned-assumptions

## assumptions found in blueprint

### assumption 1: withImmute is safe to call on fresh instances

**claim**: fresh domain object instances from `new DomainObjectConstructor(obj)` can safely have `withImmute` applied.

**evidence**:
- `withImmute` uses `Object.defineProperty` with `configurable: false, writable: false`
- fresh instances have no prior `.clone` property
- `DomainObject.build()` uses same pattern: `new this(props)` then `withImmute(instance)`

**what if opposite were true?**
- if instances already had `.clone`, `Object.defineProperty` would fail silently or throw
- checked: DomainObject constructor does NOT add `.clone` — it only calls `hydrateNestedDomainObjects` and `Object.assign`

**verdict**: assumption holds. fresh instances are safe to wrap.

---

### assumption 2: return type change is backwards compatible

**claim**: change from `deserialize<T>(): T` to `deserialize<T>(): WithImmute<T>` is not a break.

**evidence**:
- `WithImmute<T>` is defined as `T & { clone(...): WithImmute<T> }`
- this is a supertype of `T` — `WithImmute<T>` is assignable wherever `T` is expected
- vision Q3 explicitly confirms this

**what if opposite were true?**
- if `WithImmute<T>` were not assignable to `T`, all call sites would need updates
- checked: TypeScript structural types means additional properties keep compatibility

**verdict**: assumption holds. type change is backwards compatible.

---

### assumption 3: nested domain objects get .clone() via recursive traversal

**claim** (from blueprint notes): "deserialize's toHydrated recursively processes the entire object tree, and when it encounters any domain object (via `_dobj` marker), it calls toHydratedObject which applies withImmute."

**this assumption is WRONG.**

**evidence from code trace**:

1. `deserialize` receives `{ _dobj: "Parent", nested: { _dobj: "Child", ... } }`
2. `toHydrated` calls `toHydratedObject`
3. `toHydratedObject` sees `_dobj: "Parent"`, line 91-106:
   ```ts
   if (obj._dobj) {
     // lookup constructor...
     return new DomainObjectConstructor(obj, { skip: context.skip });
   }
   ```
4. the constructor calls `hydrateNestedDomainObjects` which creates `new ChildClass(nested_json)` WITHOUT `withImmute`
5. `toHydratedObject` returns immediately — never processes nested objects

**the recursive traversal only happens for plain objects** (lines 109-118), not for domain objects.

**what this means**:
- parent domain object gets `.clone()` from blueprint change
- nested domain objects do NOT get `.clone()` — they're created inside the constructor

---

## issue found: nested domain objects miss withImmute

**problem**: blueprint assumes `toHydrated` sees nested domain objects, but they're consumed by the parent constructor before recursive traversal.

**impact**: criteria usecase.3 ("nested domain objects each get .clone()") will FAIL with proposed implementation.

**options to fix**:

1. **post-construction recursion**: after instance creation, recursively traverse and apply `withImmute` to all nested domain objects

2. **pre-construction recursion**: before constructor call, recursively process nested objects first (but this conflicts with how `hydrateNestedDomainObjects` works)

3. **modify hydrateNestedDomainObjects**: apply `withImmute` when it creates nested instances (but affects ALL instantiation, not just deserialize)

**recommended fix**: option 1 — add recursive traversal after instance creation:

```ts
// in toHydratedObject, after instance creation:
const instance = new DomainObjectConstructor(obj, { skip: context.skip });
return applyWithImmuteToTree(instance, context);
```

where `applyWithImmuteToTree` traverses all properties and applies `withImmute` to any domain object found.

---

## fix applied: updated blueprint

blueprint updated with:
1. corrected notes section — now explains WHY recursion IS required
2. added `applyWithImmuteToTree` helper function in codepath tree
3. added helper function implementation in implementation details
4. updated import to include `isOfDomainObject`
5. changed wrapping call to use recursive helper

---

## other assumptions verified

### assumption: performance is negligible

**claim**: `withImmute` is O(1), just `Object.defineProperty`

**verified**: true. no iteration, no copy. single property definition.

### assumption: no one depends on absence of .clone()

**claim**: no user code relies on `.clone` NOT present after deserialize

**verified**: reasonable assumption — hard to imagine why anyone would check for absence of a method

---

## conclusion

found one CRITICAL issue: the blueprint incorrectly assumed nested domain objects would receive `.clone()` via recursive traversal.

**fix applied**: added `applyWithImmuteToTree` helper to recursively apply `withImmute` to all nested domain objects after instance creation.

**status**: issue found and fixed
