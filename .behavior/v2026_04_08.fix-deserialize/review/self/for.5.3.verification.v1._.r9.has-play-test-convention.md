# review.self: has-play-test-convention (r9)

## the question

> are journey test files named correctly with `.play.test.ts` suffix?

## repo test convention analysis

### pre-extant test files in repo

```
src/**/*.test.ts
```

found 34 test files, all use `.test.ts` suffix:

```
src/instantiation/DomainEntity.test.ts
src/instantiation/DomainObject.test.ts
src/manipulation/serde/serialize.test.ts
src/manipulation/serde/deserialize.test.ts
... (30 more)
```

### check for `.play.test.ts` convention

```bash
find src -name '*.play.test.ts'
# (no results)

find src -name '*.play.*.test.ts'
# (no results)
```

**this repo does not use the `.play.test.ts` convention.**

## convention analysis

| convention | used in repo? | evidence |
|------------|---------------|----------|
| `.test.ts` | yes | 34 pre-extant test files |
| `.play.test.ts` | no | zero files found |
| `.integration.test.ts` | no | zero files found |
| `.acceptance.test.ts` | no | zero files found |

### why this repo doesn't use `.play.` convention

1. **library package**: domain-objects is a library, not an app or CLI
2. **no journey tests needed**: library functions don't have user journeys
3. **unit tests sufficient**: transformer functions are tested via unit tests
4. **pre-extant convention**: follows `.test.ts` pattern established in repo

### what I added

| file | convention | appropriate? |
|------|------------|--------------|
| `deserialize.test.ts` (modified) | `.test.ts` | yes — follows repo convention |

I added 23 new tests to the pre-extant `deserialize.test.ts` file, which already follows the repo's `.test.ts` convention.

## fallback convention verification

the guide says:

> if not supported, is the fallback convention used?

the fallback convention for this repo is `.test.ts`, which I followed.

## issues found

none. the repo convention is `.test.ts` and I followed it.

## why it holds

1. repo uses `.test.ts` convention (34 pre-extant files)
2. `.play.test.ts` convention is not established in this repo
3. my changes follow the pre-extant convention
4. tests added to pre-extant `deserialize.test.ts` file
5. no convention drift introduced

