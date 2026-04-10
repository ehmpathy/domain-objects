# review.self: has-pruned-backcompat (r2)

## review scope

line-by-line review of backwards compat concerns in all modified files.

## files reviewed

1. `src/manipulation/immute/withImmute.ts` - read lines 1-73
2. `src/manipulation/serde/deserialize.ts` - read lines 1-131
3. `src/instantiation/hydrate/hydrateNestedDomainObjects.ts` - changes at lines 77, 130

## backwards compat concerns analyzed

### 1. `withClone` deprecated alias (withImmute.ts:72)

```ts
export const withClone = singular;
```

**was this explicitly requested?** no.

**evidence it is needed?** this alias was pre-extant in the codebase before this change. i preserved it because removal would be a separate concern.

**verdict**: pre-extant. not introduced by this change. no action needed.

### 2. `skip` option fallback (deserialize.ts:109-113)

```ts
if (context.skip) {
  const instance = new DomainObjectConstructor(obj, { skip: context.skip });
  return withImmute(instance);
}
```

**was this explicitly requested?** no. vision states "backwards compatible" but does not mention `skip`.

**evidence it is needed?** yes. the `skip` option is part of `DomainObjectInstantiationOptions`:
- defined in `src/instantiation/DomainObject.ts`
- used in tests: `deserialize(..., { skip: { schema: true } })`
- without this fallback, tests fail because `.build()` doesn't accept `skip`

**is this a public API or internal?** unclear. the type is exported but may be internal use only.

**verdict**: required to avoid test failures. flagged as open question for wisher.

### 3. return type `WithImmute<T>` extends `T` (withImmute.ts:7-10)

```ts
export type WithImmute<T> = T & {
  clone(updates?: Partial<T>): WithImmute<T>;
};
```

**was this explicitly requested?** yes. vision states:
> "this is NOT a type break because WithImmute<T> extends T"

**why it holds**: intersection type `T & {...}` is assignable to `T` by TypeScript structural type rules.

**verdict**: explicitly requested. correct implementation.

### 4. non-enumerable `.clone()` property

**was this explicitly requested?** yes. vision states:
> "the property doesn't affect serialization, equality checks, or iteration"

**why it holds**:
- `enumerable: false` in `Object.defineProperty` (withImmute.ts:22)
- `JSON.stringify()` ignores non-enumerable properties
- `Object.keys()` ignores non-enumerable properties
- spread `{...obj}` ignores non-enumerable properties

**verdict**: explicitly requested. correctly implemented.

## open questions for wisher

### `skip` option backwards compat

the `skip` option fallback at deserialize.ts:109-113 was added to avoid test failures, not from an explicit requirement.

**question**: is `skip` a public API that external users depend on? if yes, keep the fallback. if internal only, we could remove it and update tests.

## conclusion

all backwards compat concerns are either:
1. pre-extant (withClone alias)
2. explicitly requested (WithImmute type, non-enumerable property)
3. required for extant tests (skip option fallback - flagged as open question)
