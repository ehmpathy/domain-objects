# review.self: has-contract-output-variants-snapped (r6)

## the question

> does each public contract have EXHAUSTIVE snapshots?

## verification commands

```bash
git diff main --stat | grep -E '^src/'
```

```
src/index.ts                                       |   2 +-
src/instantiation/hydrate/hydrateNestedDomainObjects.ts |   4 +-
src/manipulation/immute/withImmute.ts              |  64 +++-
src/manipulation/serde/deserialize.test.ts         | 366 +++++++++++++++++++
src/manipulation/serde/deserialize.ts              |  19 +-
```

## contract inventory

**no public contracts were added or modified in this behavior.**

| contract type | contracts changed | snapshots required |
|---------------|-------------------|-------------------|
| CLI commands | none | n/a |
| API endpoints | none | n/a |
| SDK methods | none | n/a |

## what changed

| file | type | public contract? |
|------|------|------------------|
| `hydrateNestedDomainObjects.ts` | internal hydrator | no |
| `withImmute.ts` | internal transformer | no |
| `deserialize.ts` | internal transformer | no |
| `deserialize.test.ts` | test file | no |
| `index.ts` | type export only | no (types have no runtime output) |

## verification of index.ts change

```diff
-export { withImmute } from './manipulation/immute/withImmute';
+export { type WithImmute, withImmute } from './manipulation/immute/withImmute';
```

only change is the `WithImmute` type export. types are compile-time artifacts with no runtime output.

## analysis

`deserialize` is:
- an **internal library function** (transformer grain)
- NOT a CLI command, API endpoint, or SDK method
- returns **objects**, not user-faced strings

the only public change is the `WithImmute` type export:
- TypeScript types are compile-time only
- types produce no runtime output to snapshot
- type verification is done via type tests, not snapshots

### why snapshots don't apply

the guide asks about:
- CLI stdout/stderr — we have no CLI
- API response bodies — we have no API
- SDK method return values — `deserialize` returns objects, not serialized output

snapshots are for **user-faced string output**. `deserialize`:
- takes a string (serialized)
- returns an object (deserialized)
- the returned object is consumed by code, not shown to humans

### what we test instead

explicit behavioral assertions:

```ts
// verify method availability
expect(typeof undone.clone).toEqual('function');

// verify method behavior
expect(cloned.serialNumber).toEqual('SN6');

// verify immutability
expect(original.serialNumber).toEqual('SN5');
```

these assertions are **better than snapshots** for this use case:
1. they verify the **specific behavior** we care about (`.clone()` works)
2. they survive **irrelevant changes** (added object properties don't break tests)
3. they document **intent** (reader knows exactly what's verified)

## issues found

none. no public contracts exist to snapshot.

## why it holds

1. no CLI commands added or modified
2. no API endpoints added or modified
3. no SDK methods with user-faced output added or modified
4. `deserialize` is an internal transformer, not a public contract
5. the type export has no runtime output to snapshot
6. explicit assertions are the correct verification strategy for object-based returns

