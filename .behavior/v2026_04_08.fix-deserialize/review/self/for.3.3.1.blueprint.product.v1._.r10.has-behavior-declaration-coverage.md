# self-review r10: has-behavior-declaration-coverage

## vision requirements coverage

### requirement 1: `.clone()` works after deserialize

**vision says**:
> "try to use .clone() — boom"
> "after: it just works"

**blueprint addresses**:
- codepath tree line 41: `[+] create applyWithImmuteToTree(instance)` — wraps with `.clone()`
- implementation details section: `withImmute(value as Record<string, any>)` — adds `.clone()` method

**status**: covered

---

### requirement 2: nested domain objects have `.clone()`

**vision says**:
> edgecases table: "nested domain objects" — "each gets .clone() (fresh instance, wrap once)"

**blueprint addresses**:
- codepath tree lines 45-51: recursive `applyWithImmuteToTree` recurses into properties, arrays, and plain objects
- notes section: explains why recursive traversal is required

**status**: covered

---

### requirement 3: arrays of domain objects have `.clone()`

**vision says**:
> edgecases table: "arrays of domain objects" — "each element gets .clone()"

**blueprint addresses**:
- codepath tree lines 48-49: `if Array.isArray(value)` → `recurse into elements`
- implementation details: `value.forEach(applyWithImmuteToTree)`

**status**: covered

---

### requirement 4: non-domain objects unchanged

**vision says**:
> edgecases table: "non-domain objects" — "unchanged (no .clone() added)"

**blueprint addresses**:
- codepath tree: only applies `withImmute` when `isOfDomainObject(value)` is true
- plain objects get traversed but not wrapped

**status**: covered

---

### requirement 5: return type changes to `WithImmute<T>`

**vision says**:
> "change return type to `WithImmute<T>` and export `WithImmute` type"

**blueprint addresses**:
- type signature change section: `deserialize<T>(...): WithImmute<T>`
- index.ts changes section: `export type { WithImmute }`

**status**: covered

---

### requirement 6: backwards compatible

**vision says**:
> "this is NOT a type break because `WithImmute<T>` extends `T`"
> "do users need to change their code? no. backwards compatible"

**blueprint addresses**:
- type signature uses `WithImmute<T>` which extends `T`
- no break changes to API
- no new required parameters

**status**: covered — backwards compat addressed by design (type extension)

---

### requirement 7: no new options

**vision says**:
> "no new api. no new options. it just works."

**blueprint addresses**:
- no new parameters added to `deserialize`
- `withImmute` applied automatically, not opt-in

**status**: covered

---

## criteria coverage

### usecase.1: deserialize single domain object

**criteria says**:
> `.clone()` method is available on result
> `.clone()` returns a new instance with updates applied
> `.clone()` result also has `.clone()` method

**blueprint test tree**:
- `[+] create 'should have .clone() method after deserialize'`
- `[+] create 'should preserve .clone() on cloned instances'`

**status**: covered

---

### usecase.2: deserialize array of domain objects

**criteria says**:
> each element has `.clone()` method
> array iteration works normally

**blueprint test tree**:
- `[+] create 'should have .clone() on each element in array'`

**status**: covered

---

### usecase.3: deserialize nested domain objects

**criteria says**:
> parent has `.clone()` method
> nested child has `.clone()` method

**blueprint test tree**:
- `[+] create 'should have .clone() on nested domain objects'`

**status**: covered

---

### usecase.4: deserialize non-domain objects

**criteria says**:
> result is a plain object
> no `.clone()` method is added

**blueprint test tree**:
- `[+] create 'should not add .clone() to non-domain objects'`

**status**: covered

---

### usecase.5: deserialize mixed content

**criteria says**:
> domain objects have `.clone()` method
> plain objects remain plain

**blueprint test tree**:
- `[+] create 'should selectively add .clone() in mixed content'`

**status**: covered

---

### usecase.6: TypeScript types

**criteria says**:
> return type includes `.clone()` in autocomplete
> return type is assignable to the original type T

**blueprint addresses**:
- type signature: `): WithImmute<T>`
- index.ts exports `WithImmute` type for explicit type annotation

**status**: covered

---

### usecase.7: round-trip consistency

**criteria says**:
> deserialized object has `.clone()` method
> deserialized object equals original via getUniqueIdentifier

**blueprint test tree**:
- `[+] create 'should preserve .clone() in round-trip'`

**status**: covered

---

---

## why each coverage holds

### vision coverage: why it holds

1. **`.clone()` works after deserialize** — holds because blueprint adds `applyWithImmuteToTree(instance)` at line 106 of deserialize.ts, which calls `withImmute(value)` on every domain object. `withImmute` adds `.clone()` method via `Object.defineProperty`. the method is available immediately after deserialize returns.

2. **nested domain objects** — holds because `applyWithImmuteToTree` recurses into properties of domain objects via `Object.keys(value).forEach((key) => applyWithImmuteToTree(value[key]))`. every nested domain object found via this traversal gets wrapped with `withImmute`.

3. **arrays of domain objects** — holds because `applyWithImmuteToTree` handles arrays with `value.forEach(applyWithImmuteToTree)`, which visits each element and applies `withImmute` to any domain objects found.

4. **non-domain objects unchanged** — holds because `withImmute` is only called when `isOfDomainObject(value)` returns true. plain objects are traversed (to find nested domain objects) but not wrapped.

5. **`WithImmute<T>` return type** — holds because blueprint explicitly changes the return type signature and adds the type export. implementation details section shows the exact changes.

6. **backwards compat** — holds because TypeScript uses structural types. `WithImmute<T>` is defined as `T & { clone(...) }`. since it contains all properties of `T` plus `.clone()`, any code that expects `T` can receive `WithImmute<T>` without type errors.

7. **no new options** — holds because the blueprint makes no changes to the function signature's `context` parameter. `withImmute` is applied unconditionally, not via an option.

### criteria coverage: why it holds

1. **usecase.1** — blueprint test tree includes tests for `.clone()` availability and chained clones. the implementation wraps every instantiated domain object with `withImmute`.

2. **usecase.2** — blueprint test tree includes test for array elements. the implementation traverses arrays via `forEach` and wraps each domain object element.

3. **usecase.3** — blueprint test tree includes test for nested objects. the implementation recurses into properties via `Object.keys().forEach()` to wrap nested domain objects.

4. **usecase.4** — blueprint test tree includes test for non-domain objects. the implementation only calls `withImmute` when `isOfDomainObject()` is true.

5. **usecase.5** — blueprint test tree includes test for mixed content. the implementation's conditional `isOfDomainObject()` check ensures only domain objects get wrapped.

6. **usecase.6** — blueprint changes return type to `WithImmute<T>` which extends `T`. TypeScript will show `.clone()` in autocomplete. assignment to `T` works because `WithImmute<T>` contains all of `T`.

7. **usecase.7** — blueprint test tree includes round-trip test. the implementation applies `withImmute` after every instantiation, so round-trip preserves `.clone()`.

---

## conclusion

| source | requirement | status | why it holds |
|--------|-------------|--------|--------------|
| vision | .clone() works | covered | applyWithImmuteToTree calls withImmute on all domain objects |
| vision | nested objects | covered | recursive traversal via Object.keys().forEach() |
| vision | arrays | covered | array.forEach visits each element |
| vision | non-domain objects | covered | isOfDomainObject() guard |
| vision | WithImmute<T> return type | covered | type signature + export added |
| vision | backwards compat | covered | WithImmute<T> extends T (structural types) |
| vision | no new options | covered | no context parameter changes |
| criteria | usecase.1 single object | covered | tests + implementation |
| criteria | usecase.2 array | covered | tests + forEach traversal |
| criteria | usecase.3 nested | covered | tests + recursive traversal |
| criteria | usecase.4 non-domain | covered | tests + isOfDomainObject guard |
| criteria | usecase.5 mixed | covered | tests + conditional wrap |
| criteria | usecase.6 types | covered | WithImmute<T> return type |
| criteria | usecase.7 round-trip | covered | tests + consistent wrap |

**status**: all requirements from vision and criteria are addressed in the blueprint. no gaps found.
