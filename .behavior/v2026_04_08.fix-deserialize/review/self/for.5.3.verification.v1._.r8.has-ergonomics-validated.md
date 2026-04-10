# review.self: has-ergonomics-validated (r8)

## the question

> does the actual input/output match what felt right at design time?

## reference point

no repros artifact exists for this behavior (library fix, not user-faced feature).

the vision (1.vision.md) defines the planned ergonomics:

### planned ergonomics (from vision)

```ts
// vision said: same code, but .clone() works
const cached = await cache.get(key);
const domains = deserialize<DeclaredDomain[]>(cached, {
  with: [DeclaredDomain],
});
const updated = domains[0].clone({ isLocked: false }); // should work
```

### implemented ergonomics

```ts
// actual implementation: exactly as planned
const cached = await cache.get(key);
const domains = deserialize<DeclaredDomain[]>(cached, {
  with: [DeclaredDomain],
});
const updated = domains[0].clone({ isLocked: false }); // works!
```

**the ergonomics match exactly.**

## input/output comparison

### input (unchanged)

| aspect | planned | implemented |
|--------|---------|-------------|
| function signature | `deserialize<T>(serialized, context)` | `deserialize<T>(serialized, context)` |
| serialized param | string (JSON) | string (JSON) |
| context.with | array of domain object classes | array of domain object classes |

**input is unchanged from pre-extant API.**

### output (enhanced)

| aspect | planned | implemented |
|--------|---------|-------------|
| return type | `WithImmute<T>` | `WithImmute<T>` |
| has `.clone()` | yes | yes |
| assignable to `T` | yes | yes |
| nested objects | each has `.clone()` | each has `.clone()` |
| arrays | each element has `.clone()` | each element has `.clone()` |

**output matches vision exactly.**

## ergonomic goals verification

| goal from vision | achieved? | evidence |
|------------------|-----------|----------|
| ".clone() works after deserialize" | yes | test: 'should have .clone() method after deserialize' |
| "no manual wrap needed" | yes | no additional code required |
| "backwards compatible" | yes | `WithImmute<T>` assignable to `T` |
| "no performance regression" | yes | withImmute is O(1) defineProperty |
| "safe: only adds non-enumerable property" | yes | withImmute implementation unchanged |

## design drift check

| aspect | drifted? | notes |
|--------|----------|-------|
| API signature | no | input unchanged |
| return type | **enhanced** | `T` → `WithImmute<T>` (backwards compatible) |
| behavior | **enhanced** | now has `.clone()` |
| nested handle | no | as planned |
| array handle | no | as planned |

the only "drift" is the enhancement itself — which is the entire point of this fix.

## issues found

none. ergonomics match the vision exactly.

## why it holds

1. input API unchanged — no contract breaks
2. output enhanced with `.clone()` — as planned in vision
3. `WithImmute<T>` assignable to `T` — backwards compatible
4. no manual wrap required — frictionless as promised
5. nested objects and arrays handled correctly — as specified in blackbox criteria
6. type system knows about `.clone()` — TypeScript support complete

