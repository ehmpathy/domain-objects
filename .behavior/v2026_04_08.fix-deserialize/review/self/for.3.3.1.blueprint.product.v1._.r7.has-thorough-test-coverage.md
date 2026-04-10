# self-review r7: has-thorough-test-coverage

## layer coverage check

### what is deserialize?

`deserialize` is a **transformer** (pure computation):
- input: serialized string
- output: hydrated domain objects
- no i/o, no database, no network
- deterministic: same input → same output

### appropriate test type?

| layer | required test type | blueprint declares |
|-------|-------------------|-------------------|
| transformer | unit test | unit test |

**verdict**: layer coverage is correct.

**why it holds**: deserialize does pure in-memory computation on a string. no external dependencies. tests can run with in-memory fixtures. this is the definition of unit-testable.

---

## case coverage check

### positive cases

| case | declared in blueprint? | traces to criteria |
|------|----------------------|-------------------|
| single domain object → .clone() | yes | usecase.1 |
| cloned instance → .clone() | yes | usecase.1 edgecase |
| array elements → .clone() | yes | usecase.2 |
| nested objects → .clone() | yes | usecase.3 |
| non-domain objects → no .clone() | yes | usecase.4 |
| mixed content → selective .clone() | yes | usecase.5 |
| round-trip preserves .clone() | yes | usecase.7 |

**verdict**: all positive cases from criteria are covered.

### negative cases

**question**: are negative cases declared?

**analysis**:

the blueprint adds ONE new codepath:
```ts
const instance = new DomainObjectConstructor(obj, { skip: context.skip });
return applyWithImmuteToTree(instance);
```

this code is ONLY reached when:
1. JSON.parse succeeds (valid JSON)
2. obj has `_dobj` marker
3. constructor is found in context.with

if any of these fail, the extant deserialize code handles it:
- invalid JSON → JSON.parse throws (extant test)
- absent class → DeserializationMissingDomainObjectClassError (extant test)
- no `_dobj` → plain object path (not affected by change)

**what negative case would the NEW code create?**

`withImmute` never fails — it just adds a property. `applyWithImmuteToTree` never fails — it recursively traverses and applies withImmute.

**verdict**: no NEW negative cases exist for this change. extant negative tests cover pre-conditions.

**why it holds**: the new code is additive — it wraps successfully created instances. failure modes belong to extant code (JSON.parse, constructor lookup), which already has tests.

### edge cases

| edge case | declared? | why it's covered |
|-----------|-----------|------------------|
| nested domain objects | yes | explicit test for parent + nested .clone() |
| arrays of domain objects | yes | explicit test for each element |
| mixed content | yes | domain objects get .clone(), plain don't |
| empty array | implicit | array.forEach on empty is no-op |
| deeply nested | implicit | recursive traversal handles any depth |

**verdict**: edge cases are covered.

---

## snapshot coverage check

**does deserialize need snapshots?**

no — deserialize is an internal transformer, not a contract entry point:
- not a CLI (no stdout to snapshot)
- not an API (no HTTP response to snapshot)
- not an SDK public method (behavior, not output format)

snapshots are for contract outputs that humans review. deserialize output is programmatic.

**verdict**: snapshots not applicable to this transformer.

---

## test tree verification

```
src/manipulation/serde/
├── deserialize.ts
└── [~] update deserialize.test.ts
    └── describe('domain objects')
        ├── [○] retain 'should deserialize domain objects'
        ├── [+] create 'should have .clone() method after deserialize'
        ├── [+] create 'should preserve .clone() on cloned instances'
        ├── [○] retain 'recursively deserialize domain objects'
        ├── [+] create 'should have .clone() on nested domain objects'
        ├── [○] retain 'recursively deserialize an array of domain objects'
        └── [+] create 'should have .clone() on each element in array'
```

**location matches convention?** yes — collocated `.test.ts` file

**test types match layer?** yes — unit tests for transformer

---

## ISSUE FOUND: coverage table vs test tree mismatch

### gap identified

the coverage by case table claims these cases are covered:

| case | claimed in table? | test in tree? |
|------|------------------|---------------|
| non-domain objects → no .clone() | yes | NO |
| mixed content → selective .clone() | yes | NO |
| round-trip preserves .clone() | yes | NO |

the test tree does NOT include explicit tests for:
- usecase.4: non-domain objects
- usecase.5: mixed content
- usecase.7: round-trip

### analysis

**usecase.4 (non-domain objects)**: could be implicitly covered by extant tests, but no NEW test verifies that `.clone()` is NOT added to plain objects. this needs explicit verification.

**usecase.5 (mixed content)**: a structure with both domain objects and plain objects. needs explicit test that domain objects get `.clone()` while plain objects don't.

**usecase.7 (round-trip)**: serialize → deserialize → `.clone()` works. this validates the full cycle. needs explicit test.

### fix required

add 3 tests to the test tree:
1. `[+] create 'should not add .clone() to non-domain objects'`
2. `[+] create 'should selectively add .clone() in mixed content'`
3. `[+] create 'should preserve .clone() in round-trip'`

### fix applied to blueprint

updated test tree in blueprint with 3 additional tests.

---

## conclusion

| dimension | status | why |
|-----------|--------|-----|
| layer coverage | complete | transformer → unit tests, correctly declared |
| positive cases | **FIXED** | found 3 cases in table not in tree, added tests |
| negative cases | not applicable | new code has no failure modes |
| edge cases | complete | nested, arrays, mixed content now covered |
| snapshots | not applicable | internal transformer, not contract |
| test tree | **FIXED** | added 3 tests for gaps |

**status**: issue found and fixed — added 3 tests for uncovered cases
