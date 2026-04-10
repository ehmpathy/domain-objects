# self-review: has-questioned-requirements

## the requirement

> deserialize should always apply withImmute to domain objects

## questions about the requirement

### who said this was needed? when? why?

- **who**: a mechanic reported the defect
- **when**: in the wish, with reference to real-world incident (`TypeError: domain.clone is not a function`)
- **why**: users expect `.clone()` on domain objects; `DomainObject.build()` provides it; `deserialize` does not

### what evidence supports this?

verified in the code:

1. `deserialize.ts:106` uses `new DomainObjectConstructor(obj)` — raw instance
2. `DomainObject.ts:172-173` shows `.build()` calls `withImmute(instance)`
3. `withImmute.ts:24-28` just adds a non-enumerable `clone` property via `Object.defineProperty`

the inconsistency is real and observable.

### what if we didn't do this?

users would continue to:
- hit `TypeError: domain.clone is not a function`
- manually wrap with `withImmute` after every deserialize
- remember this gotcha forever

cost of inaction: persistent friction and bugs.

### is the scope right?

the wish says "always add withImmute, no reason not to".

**questioned**: is there ANY reason NOT to add `.clone()`?

| concern | analysis |
|---------|----------|
| performance | withImmute is O(1) — just `Object.defineProperty` |
| memory | one non-enumerable property per object |
| serialization | non-enumerable, doesn't appear in JSON |
| equality | non-enumerable, doesn't affect comparison |
| additive change | objects gain a method, no break |

**conclusion**: no valid reason to NOT apply withImmute.

### could we achieve the goal simpler?

| option | complexity | matches wish? |
|--------|------------|---------------|
| always apply withImmute | single line change | ✓ yes |
| opt-in via flag | new api surface | ✗ wish says "always" |
| let callers wrap | no change, friction remains | ✗ wish says "fix" |

simplest solution matches the wish.

## potential issues checked

### is withImmute idempotent?

**concern**: what if object already has `.clone()`?

**analysis**: deserialize creates NEW instances via `new DomainObjectConstructor()`. fresh instances do NOT have `.clone()` unless created via `.build()`. so `withImmute` is always applied to objects without `.clone()`.

**verdict**: safe.

### what about nested objects?

**concern**: nested domain objects are also created fresh.

**analysis**: `hydrateNestedDomainObjects` also uses `new`, not `.build()`. so nested objects also lack `.clone()`. the fix must apply `withImmute` recursively.

**verdict**: need to ensure recursive application.

### mental model accuracy

**concern**: vision says "gives me back what i put in"

**analysis**: technically, deserialize now gives BACK MORE than you put in (adds `.clone()` even if original lacked it). but this is a pit of success — users get more, not less.

**verdict**: acceptable. could clarify phrasing but not a blocker.

## conclusion

**the requirement holds.**

- evidence is clear (code inconsistency)
- cost of inaction is persistent friction
- scope is minimal (single behavior change)
- simplest solution matches the wish
- no valid counterarguments found

## action items

- [x] verified withImmute is O(1)
- [x] verified deserialize creates fresh instances
- [x] verified nested objects also need wrap
- [ ] implementation should wrap recursively (noted for blueprint)
