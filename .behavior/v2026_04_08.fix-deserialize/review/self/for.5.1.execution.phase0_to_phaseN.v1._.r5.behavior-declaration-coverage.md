# review.self: behavior-declaration-coverage (r5)

## deep review

went through vision, criteria, and blueprint line by line against the implementation.

## vision requirements

### requirement 1: `.clone()` works after deserialize

**implementation:** `deserialize.ts:117` calls `DomainObjectConstructor.build(obj)` which internally calls `withImmute`.

**why it holds:** `.build()` is the standard constructor method that applies `withImmute`, so all domain objects receive `.clone()` via the constructor chain.

### requirement 2: return type `WithImmute<T>`

**implementation:** `deserialize.ts:32` declares `): WithImmute<T> =>`.

**why it holds:** the return type signature changed from `T` to `WithImmute<T>`, and TypeScript knows about `.clone()` on the return value.

### requirement 3: no new API

**implementation:** no new options or parameters added to `deserialize` function.

**why it holds:** the function signature remains `deserialize<T>(serialized: string, context: {...})`. the change is purely additive behavior.

### requirement 4: export WithImmute type

**implementation:** `index.ts:38` exports `{ type WithImmute, withImmute }`.

**why it holds:** users can import `WithImmute` type for explicit type annotations.

### requirement 5: no performance regression

**implementation:** `.build()` calls `withImmute` which is O(1) per object.

**why it holds:** `withImmute.singular` adds one non-enumerable property via `Object.defineProperty`. nested domain objects receive `.clone()` through their own `.build()` calls via `hydrateNestedDomainObjects`.

## criteria usecases

### usecase.1: deserialize single domain object

| criterion | implementation | test |
|-----------|----------------|------|
| `.clone()` available | `.build()` at line 117 | line 250-259 |
| `.clone()` returns new instance | `withImmute` semantics | line 275-287 |
| `.clone()` result also has `.clone()` | `withImmute` wraps result | line 261-273 |

**why it holds:** all criteria tested with explicit assertions on `.clone()` behavior.

### usecase.2: deserialize array of domain objects

| criterion | implementation | test |
|-----------|----------------|------|
| each element has `.clone()` | `toHydrated` recursion line 77 | line 390-408 |
| array iteration works | non-enumerable property | line 410-438 |

**why it holds:** arrays recurse via `value.map((el) => toHydrated(el, context))`, and each domain object element gets `.clone()` via `.build()`.

### usecase.3: deserialize nested domain objects

| criterion | implementation | test |
|-----------|----------------|------|
| parent has `.clone()` | `.build()` at line 117 | line 304-325 |
| nested child has `.clone()` | `hydrateNestedDomainObjects` uses `.build()` | line 327-349 |

**why it holds:** parent calls `.build()` which triggers `hydrateNestedDomainObjects`, and nested domain objects also use `.build()` (lines 77, 130 in hydrateNestedDomainObjects.ts).

### usecase.4: deserialize non-domain objects

| criterion | implementation | test |
|-----------|----------------|------|
| result is plain object | `toHydratedObject` without `_dobj` lines 120-129 | line 442-447 |
| no `.clone()` method added | only domain objects get `.build()` | line 442-447 |

**why it holds:** plain objects (without `_dobj` marker) are recursively traversed but never passed to `.build()`.

### usecase.5: deserialize mixed content

| criterion | implementation | test |
|-----------|----------------|------|
| domain objects have `.clone()` | `_dobj` check selects for `.build()` | line 478-494 |
| plain objects remain plain | recursive traversal skips plain objects | line 496-513 |

**why it holds:** the implementation only calls `.build()` when `obj._dobj` exists. tests verify both domain and plain objects in same structure.

### usecase.6: TypeScript types

| criterion | implementation | test |
|-----------|----------------|------|
| return type includes `.clone()` | `WithImmute<T>` at line 32 | line 589-602 |
| return type assignable to T | `WithImmute<T>` extends T | line 575-587 |

**why it holds:** `WithImmute<T>` is defined as `T & { clone(...): WithImmute<T> }`. the intersection type ensures assignability to `T`.

### usecase.7: round-trip consistency

| criterion | implementation | test |
|-----------|----------------|------|
| `.clone()` after round-trip | `.build()` on every deserialize | line 547-560 |
| identity preserved | standard domain object semantics | line 562-571 |

**why it holds:** `.build()` runs on every deserialize, regardless of whether the original had `.clone()`. identity is preserved because `withImmute` is additive (non-enumerable property).

## blueprint components

| component | location | verified |
|-----------|----------|----------|
| import withImmute | `deserialize.ts:4-6` | yes |
| return type `WithImmute<T>` | `deserialize.ts:32` | yes |
| use `.build()` for domain objects | `deserialize.ts:117` | yes |
| fallback with `skip` option | `deserialize.ts:110-112` | yes |
| export `WithImmute` from index.ts | `index.ts:38` | yes |
| `withImmute.recursive` variant | `withImmute.ts:34-56` | yes |
| `withImmute.singular` variant | `withImmute.ts:17-28` | yes |
| idempotency check | `withImmute.ts:19` | yes |

## issues found

none. all vision requirements, criteria usecases, and blueprint components are implemented and tested.

## why it holds

1. vision requirements map to concrete implementation lines
2. every usecase criterion has a matched test
3. blueprint file/code changes match the implementation
4. no requirements were skipped or forgotten
5. implementation uses `.build()` throughout (pit of success) rather than post-hoc `applyWithImmuteToTree`
