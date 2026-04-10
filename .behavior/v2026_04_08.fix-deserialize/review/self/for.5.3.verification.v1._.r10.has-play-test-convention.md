# review.self: has-play-test-convention (r10)

## the question

> are journey test files named correctly with `.play.test.ts` suffix?

## fresh verification

ran `git ls-files src/` just now. sample output:

```
src/instantiation/DomainEntity.test.ts
src/instantiation/DomainObject.test.ts
src/manipulation/serde/deserialize.test.ts
src/manipulation/serde/serialize.test.ts
```

all test files use `.test.ts` suffix. zero `.play.test.ts` files exist.

## the guide's checklist

1. are journey tests in the right location?
2. do they have the `.play.` suffix?
3. if not supported, is the fallback convention used?

## step 1: does this behavior have journey tests?

### what is a "journey test"?

journey tests verify user workflows end-to-end:
- CLI: user runs command, sees output
- API: client sends request, receives response
- app: user clicks, screen updates

### does `deserialize` have user journeys?

**no.** `deserialize` is:
- an internal library function (transformer)
- called by other code, not by users directly
- has no UI, no CLI, no API endpoint

the "journey" for a library function is:

```ts
// developer writes:
const result = deserialize(json, { with: [DomainClass] });
// developer uses result
```

this is a unit test scenario, not a journey test.

## step 2: does repo use `.play.` convention?

### evidence: git ls-files

```bash
git ls-files src/manipulation/serde/
```

output:
```
src/manipulation/serde/__snapshots__/deserialize.test.ts.snap
src/manipulation/serde/__snapshots__/serialize.test.ts.snap
src/manipulation/serde/deserialize.test.ts
src/manipulation/serde/serialize.test.ts
src/manipulation/serde/deserialize.ts
src/manipulation/serde/serialize.ts
```

**no `.play.` files. convention is `.test.ts`.**

### evidence: glob search

| pattern | count |
|---------|-------|
| `.test.ts` | 34 |
| `.play.test.ts` | 0 |
| `.integration.test.ts` | 0 |
| `.acceptance.test.ts` | 0 |

**this repo uses `.test.ts` exclusively.**

## step 3: fallback convention

> if not supported, is the fallback convention used?

**yes.** I added 23 tests to the pre-extant `deserialize.test.ts` file:

```
src/manipulation/serde/deserialize.test.ts
```

this follows the repo's established `.test.ts` convention.

## deeper reflection

### why `.play.` doesn't apply here

| question | answer | evidence |
|----------|--------|----------|
| is this a CLI? | no | package.json has no bin |
| is this an API? | no | no endpoints |
| is this an app? | no | library package |
| are there user journeys? | no | internal function |
| does repo use `.play.`? | no | 0 files found |

### should I introduce `.play.`?

**no.** a new convention would:
- create inconsistency with 34 pre-extant test files
- confuse future maintainers
- add no value (no journeys to test)

## issues found

none.

## why it holds

1. **no user journeys**: `deserialize` is an internal transformer
2. **repo convention is `.test.ts`**: 34 pre-extant files
3. **no `.play.` convention exists**: 0 files found
4. **followed fallback**: added to pre-extant `deserialize.test.ts`
5. **consistent**: no convention drift introduced
6. **verified via git ls-files**: actual file list checked

