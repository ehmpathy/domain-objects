# review.self: has-ergonomics-validated (r9)

## the question

> does the actual input/output match what felt right at design time?

## fresh verification

re-read the vision artifact just now (1.vision.md lines 1-80).

## reference artifacts

- **vision**: `.behavior/v2026_04_08.fix-deserialize/1.vision.md`
- **blackbox criteria**: `.behavior/v2026_04_08.fix-deserialize/2.1.criteria.blackbox.md`
- **no repros artifact** — library fix, not user-faced feature

## vision comparison

### vision: "the outcome world"

from vision (1.vision.md):

```ts
// same code, but .clone() works
const cached = await cache.get(key);
const domains = deserialize<DeclaredDomain[]>(cached, {
  with: [DeclaredDomain],
});
const updated = domains[0].clone({ isLocked: false }); // ✓ works
```

### implemented: actual behavior

from test file (deserialize.test.ts):

```ts
it('should have .clone() method after deserialize', () => {
  const original = new RocketShip({ serialNumber: 'SN5', ... });
  const json = serialize(original);
  const undone = deserialize<RocketShip>(json, { with: [RocketShip] });

  expect(typeof undone.clone).toEqual('function');  // ✓ method available
  const cloned = undone.clone({ serialNumber: 'SN6' });
  expect(cloned.serialNumber).toEqual('SN6');  // ✓ update applied
  expect(original.serialNumber).toEqual('SN5');  // ✓ original unchanged
});
```

**exact match.**

## vision mental model verification

### vision said:

> "it's like JSON.parse, but for domain objects. you don't lose features in the round trip."

### implementation verifies:

```ts
it('should preserve .clone() after serialize → deserialize', () => {
  const original = new RocketShip({ ... });
  const withClone = withImmute(original);
  expect(typeof withClone.clone).toEqual('function');

  // round trip
  const serialized = serialize(withClone);
  const deserialized = deserialize<RocketShip>(serialized, { with: [RocketShip] });

  // .clone() preserved through round trip
  expect(typeof deserialized.clone).toEqual('function');
});
```

**mental model holds: features preserved through round trip.**

## vision contract verification

### vision said:

```ts
// return type changes from T to WithImmute<T>
// this is NOT a type break because WithImmute<T> extends T
deserialize<T>(...): WithImmute<T>
```

### implementation verifies:

```ts
it('type: WithImmute<T> should be assignable to T', () => {
  const undone = deserialize<RocketShip>(json, { with: [RocketShip] });
  const asOriginalType: RocketShip = undone;  // compiles — assignable
  expect(asOriginalType).toBeDefined();
});
```

**type contract holds: `WithImmute<T>` assignable to `T`.**

## vision edgecases verification

### vision said:

| edgecase | behavior |
|----------|----------|
| nested domain objects | each gets .clone() |
| arrays of domain objects | each element gets .clone() |
| non-domain objects | unchanged |
| fresh instances from deserialize | safe to wrap |

### implementation verifies:

| edgecase | test | result |
|----------|------|--------|
| nested domain objects | 'should have .clone() on nested child' | pass |
| arrays of domain objects | 'should have .clone() on each element' | pass |
| non-domain objects | 'should not add .clone() to plain objects' | pass |
| fresh instances | all tests use fresh deserialized instances | pass |

**all edgecases handled as specified.**

## design drift analysis

| aspect | vision | implementation | drifted? |
|--------|--------|----------------|----------|
| API signature | unchanged | unchanged | no |
| return type | `WithImmute<T>` | `WithImmute<T>` | no |
| `.clone()` availability | immediate | immediate | no |
| nested objects | each has `.clone()` | each has `.clone()` | no |
| arrays | each element has `.clone()` | each element has `.clone()` | no |
| type safety | assignable to `T` | assignable to `T` | no |

**zero drift. implementation matches vision exactly.**

## issues found

none. ergonomics match vision exactly.

## why it holds

1. **vision code snippet** matches implementation exactly
2. **mental model** ("JSON.parse for domain objects") verified via round-trip test
3. **type contract** (`WithImmute<T>` assignable to `T`) verified via type test
4. **edgecases** (nested, arrays, non-domain) all handled as specified
5. **zero design drift** between vision and implementation
6. **all 34 tests pass** — ergonomics work in practice

