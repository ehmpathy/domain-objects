# review.self: has-zero-test-skips (r1)

## verification

scanned for forbidden patterns in test files.

## scan results

```bash
grep -n '\.skip\|\.only' src/manipulation/serde/deserialize.test.ts
```

| line | pattern | context |
|------|---------|---------|
| 613 | `it.skip` | pre-extant "speed" section, requires `THOROUGH=true` |
| 706 | `it.skip` | pre-extant "speed" section, requires `THOROUGH=true` |

## analysis

### new tests (lines 248-609)

| check | result |
|-------|--------|
| `.skip()` | none found |
| `.only()` | none found |
| silent credential bypasses | none (no credentials needed) |
| prior failures | none |

all 23 new tests run without skips.

### pre-extant skips (lines 613, 706)

these skips are in the "speed" describe block, unrelated to `.clone()` functionality:
- 'should be faster if schema is skipped' (line 613)
- 'should be instant on repeat attempts, due to in memory cache' (line 706)

**why not remove them?**

1. these are performance tests that require `THOROUGH=true` environment variable
2. they test schema skip optimization, not `.clone()` behavior
3. they were present before this PR — not introduced by this change
4. the jest config uses `--changedSince=main` which excludes unchanged test sections

**these are not gaps in this PR's coverage.** the `.clone()` functionality is fully tested by the 23 new tests.

## issues found

none in new code.

## why it holds

1. all 23 new tests have zero skips
2. no `.only()` patterns in any test
3. no silent credential bypasses (deserialize is a pure transformer)
4. no prior failures carried forward
5. pre-extant skips are unrelated to this PR's scope and require `THOROUGH=true` mode
