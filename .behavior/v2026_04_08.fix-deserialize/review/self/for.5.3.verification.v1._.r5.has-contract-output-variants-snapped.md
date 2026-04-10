# review.self: has-contract-output-variants-snapped (r5)

## the question

> are all output variants of contract-level procedures snapped?

## why snapshots matter for contracts

snapshots excel at:
- visual diff of **string output** (CLI stdout, JSON responses)
- detection of **format drift** in user-faced artifacts
- regression alerts when output shape changes

## why snapshots do NOT apply here

`deserialize` is:
- an **internal library function** (transformer grain)
- returns **objects**, not strings
- NOT a contract-level procedure (not in src/contract/)
- NOT user-faced output (no CLI, no API response)

### the grain distinction

| grain | snapshots? | why |
|-------|------------|-----|
| contract (CLI/API) | yes | user-faced string output |
| communicator (SDK) | yes | external API responses |
| orchestrator | maybe | if produces user-faced output |
| **transformer** | **no** | returns objects, not strings |

`deserialize` is a transformer — it takes a string and returns an object. the object's **behavior** matters (has `.clone()`), not its **stringified representation**.

### what we test instead

explicit assertions on behavior:

```ts
// not snapshot — explicit assertion
expect(typeof undone.clone).toEqual('function');

// not snapshot — explicit assertion
expect(cloned.serialNumber).toEqual('SN6');

// not snapshot — explicit assertion
expect(original.serialNumber).toEqual('SN5');
```

these are better than snapshots because:
1. they verify **specific behavior** (`.clone()` method exists and works)
2. they survive **irrelevant changes** (added properties don't break tests)
3. they document **intent** (reader knows what matters)

## issues found

none. snapshots are not appropriate for this transformer.

## why it holds

1. `deserialize` is a transformer, not a contract
2. transformers return objects, not user-faced strings
3. explicit behavior assertions are better than snapshots for objects
4. all 23 new tests use explicit assertions that verify `.clone()` behavior
5. snapshot absence is correct for this grain

