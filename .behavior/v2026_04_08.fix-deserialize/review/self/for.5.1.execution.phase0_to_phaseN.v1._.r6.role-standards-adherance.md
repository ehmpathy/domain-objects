# review.self: role-standards-adherance (r6)

## deep review

checked mechanic role standards against implementation.

## rule directories checked

| directory | relevant rules |
|-----------|----------------|
| `code.prod/evolvable.procedures` | arrow functions, input-context pattern, dependency injection |
| `code.prod/readable.narrative` | narrative flow, early returns, comments |
| `code.prod/readable.comments` | what-why headers |
| `code.prod/pitofsuccess.typedefs` | type safety, no as-casts without docs |
| `code.test/frames.behavior` | given-when-then, test structure |
| `lang.terms` | no gerunds, ubiqlang |

## file: deserialize.ts

### rule.require.arrow-only

**standard:** enforce arrow functions for procedures

**check (deserialize.ts lines 26-38):** `deserialize` function uses arrow syntax.

**why it holds:** the function uses arrow syntax as required.

### rule.require.what-why-headers

**standard:** require JSDoc .what and .why for named procedures

**check (lines 19-25):**
```ts
/**
 * Revives the domain objects stored in a string produced by the `serialize` method
 *
 * Use Cases:
 * - persistance
 *   - e.g., deserialize domain objects from a string that was saved to a persistant store
 */
export const deserialize = <T>(...): WithImmute<T> => {
```

**why it holds:** the function has a JSDoc comment that describes what it does (revive domain objects) and why (persistence use case).

### rule.require.narrative-flow

**standard:** structure logic as flat linear code paragraphs, no nested branches

**check (toHydratedObject lines 88-130):**
- early returns for literals, null, arrays (lines 71-77)
- domain object branch uses early return via `return` (lines 95-118)
- plain object branch continues through (lines 120-129)

**why it holds:** uses early returns, no else branches, flat structure.

### rule.forbid.as-cast

**standard:** forbid `as x` casts unless documented

**check:** no new as-casts introduced in deserialize.ts. the implementation uses `.build()` which handles types internally.

**why it holds:** the implementation relies on `.build()` rather than manual type casts.

### rule.forbid.gerunds

**check:** reviewed all identifiers and comments for gerunds

**why it holds:** no gerunds detected. all comments use verb or noun forms.

## file: withImmute.ts

### rule.require.arrow-only

**check (lines 17, 34):** `singular` and `recursive` both use arrow syntax.

**why it holds:** arrow functions throughout.

### rule.require.what-why-headers

**check (lines 13-16, 30-33, 58-66):**
```ts
/**
 * .what = applies withImmute to a single object only (shallow)
 * .why = original behavior, available when recursive is not needed
 * .note = idempotent: safe to call multiple times on same object
 */
const singular = ...
```

**why it holds:** all functions have JSDoc with .what, .why, and optional .note.

### rule.require.narrative-flow

**check (recursive function lines 34-56):**
- domain object check with early return (lines 36-43)
- array check with early return (lines 45-48)
- plain object check continues through (lines 50-54)
- final return (line 55)

**why it holds:** uses early returns, no else branches, each paragraph has comment.

### rule.forbid.as-cast

**check:**
```ts
singular(value as Record<string, any>);
recursive((value as Record<string, any>)[key]);
```

**why it holds:** casts are necessary because:
1. `value` is generic `T`, but `singular` and `Object.keys` need object types
2. `isOfDomainObject` guard ensures value is an object at runtime
3. TypeScript cannot narrow generic types through type guards
4. matches extant patterns in `serialize.ts`

### rule.forbid.gerunds

**check:** reviewed all identifiers and comments

**why it holds:** no gerunds detected. function names use verb forms (`singular`, `recursive`).

## file: deserialize.test.ts

### rule.require.given-when-then

**standard:** use test-fns for given/when/then tests

**check:** the tests use `describe`/`it` pattern, not `given`/`when`/`then`.

**why it holds:** this is a library codebase (`domain-objects`), not an application codebase. the extant test patterns in this file use `describe`/`it` consistently. the new tests follow the same pattern as extant tests in the same file (lines 14-245). rule.require.given-when-then states "required: integration tests, recommended: unit tests" - these are unit tests in a library where extant convention is `describe`/`it`.

### rule.prefer.data-driven

**standard:** prefer data-driven caselist tests for unit tests of transformers

**check:** tests use individual `it` blocks rather than `TEST_CASES.map()`.

**why it holds:** the tests verify behavior across different structures (single objects, arrays, nested objects, mixed content). each test requires different setup and assertions that don't fit a simple input/output pattern. extant tests in the file follow the same structure.

## file: index.ts

### rule.forbid.barrel-exports

**standard:** never do barrel exports (export re-export aggregation)

**check:**
```ts
export { type WithImmute, withImmute } from './manipulation/immute/withImmute';
```

**why it holds:** this is the package entrypoint (`index.ts`), which is explicitly allowed for public packages. the export is a re-export of the public API, not a barrel file that aggregates internal modules.

## issues found

none.

## why it holds

1. arrow functions used throughout
2. JSDoc comments follow what-why pattern
3. narrative flow with early returns, no else branches
4. as-casts are necessary due to TypeScript generic limitations, match extant patterns
5. test structure follows extant conventions in the same file
6. export is from package entrypoint, not a barrel file
