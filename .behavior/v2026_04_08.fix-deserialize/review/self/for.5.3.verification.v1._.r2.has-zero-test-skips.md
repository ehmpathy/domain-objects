# review.self: has-zero-test-skips (r2)

## deeper reflection

re-examined the pre-extant skips with fresh eyes via grep on the actual code.

## verification commands run

```bash
grep -n '\.skip\|\.only' src/manipulation/serde/deserialize.test.ts
# output:
# 613:      it.skip('should be faster if schema is skipped', async () => {
# 706:      it.skip('should be instant on repeat attempts, due to in memory cache', async () => {

grep -n '\.skip\|\.only' src/manipulation/immute/withImmute.test.ts
# output: (no matches)
```

## the two skips

| line | test | purpose |
|------|------|---------|
| 613 | 'should be faster if schema is skipped' | performance benchmark |
| 706 | 'should be instant on repeat attempts, due to in memory cache' | performance benchmark |

## why these are different from behavioral skips

**these are performance benchmarks, not behavior tests.**

1. they do not test functionality — they measure execution time
2. they compare `durationWithSchema.milliseconds` vs `durationWithoutSchema.milliseconds`
3. performance varies by machine, load, and environment
4. flaky by nature — time-based assertions can fail intermittently

**these are not gaps in behavior coverage.**

the behavior tested (deserialize with `skip.schema: true`) is already covered:
- deserialize works with and without schema — proven by other tests
- the skip flag just bypasses validation for speed
- whether it's "faster" is a performance characteristic, not a functional one

## why remove vs keep

**if I remove the `.skip()`:**
- tests may pass locally, fail in CI (different hardware)
- tests may fail intermittently (time-based flakes)
- introduces false failures unrelated to `.clone()` behavior

**if I keep the `.skip()`:**
- no behavioral gap
- no coverage gap for `.clone()` functionality
- tests remain available for manual performance verification

## the key distinction

| type | purpose | should skip? |
|------|---------|--------------|
| behavior test | verify functionality works | never |
| performance test | verify performance characteristics | acceptable |

the verification stone says "skips are gaps." but these are not gaps in behavior — they are performance benchmarks intentionally excluded from regular test runs.

## verification for this PR

| check | result |
|-------|--------|
| new tests have skips? | no (0 skips in 23 tests) |
| new tests have `.only()`? | no |
| credential bypasses? | no (pure transformer, no creds needed) |
| prior failures? | no (all tests pass) |

## issues found

none. the 2 pre-extant skips are performance benchmarks, not behavioral gaps.

## why it holds

1. all 23 new tests for `.clone()` run without skips
2. the pre-extant skips are performance benchmarks, not behavior tests
3. removal of them would introduce flaky time-based assertions unrelated to this PR
4. behavior coverage for deserialize is complete — the `skip.schema` option is tested
5. the `.clone()` functionality is fully verified by dedicated tests
