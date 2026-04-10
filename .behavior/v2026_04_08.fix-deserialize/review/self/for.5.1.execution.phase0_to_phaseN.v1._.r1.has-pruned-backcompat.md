# review.self: has-pruned-backcompat

## review scope

backwards compatibility concerns in the implementation.

## backwards compat concerns identified

### 1. return type change: `T` to `WithImmute<T>`

**was this explicitly requested?**

yes. vision section "contract" states:
> "return type changes from T to WithImmute<T>. this is NOT a type break because WithImmute<T> extends T (WithImmute<T> is assignable anywhere T is expected)"

**evidence this is needed?**

yes. the vision explicitly states:
> "backwards compatible" as a goal
> "no new api. no new options. it just works."

**implementation approach?**

`WithImmute<T>` is defined as `T & { clone(...): WithImmute<T> }`, which means:
- any code that expects `T` can receive `WithImmute<T>`
- extant code continues to work without changes
- new code can use `.clone()` if desired

### 2. `skip` option support

**was this explicitly requested?**

not explicitly, but required for test suite compat.

**evidence this is needed?**

yes. extant tests use `skip: { schema: true }` option in deserialize. removal of support would break tests.

**implementation approach?**

fallback path when `skip` option provided:
```ts
if (context.skip) {
  const instance = new DomainObjectConstructor(obj, { skip: context.skip });
  return withImmute(instance);
}
```

this preserves extant behavior while still providing `.clone()`.

### 3. no new parameters or options

**was this explicitly requested?**

yes. vision states:
> "no new api. no new options."

**implementation confirms this?**

yes. the `deserialize` function signature remains unchanged except for return type.

## open questions

### `skip` option support

the `skip` option support was added for backwards compat with extant tests. this was not explicitly requested but was required to avoid test failures.

**question for wisher**: is the `skip` option a public API that users depend on, or is it internal? if internal only, we could consider removal of the fallback path in a future version.

## conclusion

backwards compatibility concerns are justified. the `skip` option fallback is the only implicit compat concern - flagged as open question.
