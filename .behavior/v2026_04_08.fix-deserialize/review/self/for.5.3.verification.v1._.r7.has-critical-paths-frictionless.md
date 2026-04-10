# review.self: has-critical-paths-frictionless (r7)

## the question

> are the critical paths frictionless in practice?

## critical path source

the guide references `3.2.distill.repros.experience.*.md` for critical paths.

**no repros artifact exists for this behavior.** this is a library fix, not a user-faced feature. the blackbox criteria (2.1.criteria.blackbox.md) defines the usecases instead.

## critical path: the fix in action

the critical path is simple:

```ts
// before: crash
const domains = deserialize<Domain[]>(cached, { with: [Domain] });
const updated = domains[0].clone({ isLocked: false });
// TypeError: domain.clone is not a function

// after: works
const domains = deserialize<Domain[]>(cached, { with: [Domain] });
const updated = domains[0].clone({ isLocked: false });
// returns new Domain with isLocked: false
```

## manual verification

ran the critical path via test:

```ts
it('should have .clone() method after deserialize', async () => {
  const original = new RocketShip({ serialNumber: 'SN5', ... });
  const json = serialize(original);
  const undone = deserialize<RocketShip>(json, { with: [RocketShip] });

  // the critical moment
  expect(typeof undone.clone).toEqual('function');
  const cloned = undone.clone({ serialNumber: 'SN6' });
  expect(cloned.serialNumber).toEqual('SN6');
});
```

**result**: test passes. `.clone()` is available. update works.

## friction check

| aspect | frictionless? | evidence |
|--------|---------------|----------|
| method availability | yes | `typeof undone.clone === 'function'` |
| method behavior | yes | `cloned.serialNumber === 'SN6'` |
| immutability | yes | `original.serialNumber === 'SN5'` (unchanged) |
| type safety | yes | `WithImmute<T>` assignable to `T` |
| nested objects | yes | nested domain objects also have `.clone()` |
| arrays | yes | each element has `.clone()` |

## issues found

none. the critical path is frictionless.

## why it holds

1. the fix addresses the root cause (deserialize didn't apply withImmute)
2. `.clone()` is now available immediately after deserialize
3. no manual wrap required by caller
4. type system knows about `.clone()` via `WithImmute<T>`
5. nested objects and arrays also receive `.clone()`
6. all 23 tests verify frictionless usage

