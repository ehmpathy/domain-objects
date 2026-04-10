# self-review r3: has-questioned-questions

## deeper reflection on open questions

### questions explicitly in the vision

| # | question | status | triage |
|---|----------|--------|--------|
| 1 | opt-in? | [answered] no | logic — wish says "no reason not to" |
| 2 | document? | [answered] yes | logic — behavior change needs changelog |
| 3 | TypeScript types? | [answered] return `WithImmute<T>` | code analysis — superset, not a break |

all three are properly triaged and answered.

---

### questions NOT in the vision that SHOULD be

**found issue**: the vision doesn't address these user-relevant questions:

#### Q4: what version bump is this?

**triage**: can answer via logic now

**answer**: minor bump. this is an additive change:
- runtime adds `.clone()` (additive)
- types change from `T` to `WithImmute<T>` (compatible, `WithImmute<T>` extends `T`)
- no removal or break

**action**: add to vision

---

#### Q5: do users need to change their code?

**triage**: can answer via logic now

**answer**: no. the change is:
- backwards compatible at runtime
- backwards compatible at type level
- users MAY choose to update types to `WithImmute<T>` for better autocomplete, but not required

**action**: add to vision

---

#### Q6: what should the changelog say?

**triage**: can answer via logic now

**answer**: format like:
```
### Added
- `deserialize` now returns domain objects with `.clone()` method via `withImmute`
- Exported `WithImmute` type for explicit type annotations

### Changed
- `deserialize<T>` return type is now `WithImmute<T>` (compatible with `T`)
```

**action**: add to vision or note for release phase

---

### questions that do NOT need to be in the vision

- "what tests to add?" — belongs in blueprint, not vision
- "how to implement?" — belongs in blueprint, not vision
- "what files to change?" — belongs in blueprint, not vision

---

## fixes applied to vision

### fix for Q4: version bump

**before**: not addressed in vision

**after**: added to vision questions section:
```
4. [answered] ~~what version bump?~~ → minor. additive change (no removal, no break).
```

**lesson**: vision should address release semantics so implementers know the impact level.

---

### fix for Q5: user code changes

**before**: not addressed in vision

**after**: added to vision questions section:
```
5. [answered] ~~do users need to change their code?~~ → no. backwards compatible at runtime and type level.
```

**lesson**: users want to know if they need to act. answer this explicitly.

---

### fix for Q6: changelog format

**before**: not addressed in vision

**after**: added to vision questions section:
```
6. [answered] ~~what should the changelog say?~~ → see release phase. format: "Added: deserialize returns objects with .clone(); Exported WithImmute type"
```

**lesson**: changelog is part of the deliverable. document the expected format early.

---

## why the original 3 questions hold

### Q1: opt-in? → no

**why it holds**: the wish explicitly says "no reason not to". an opt-in flag would add friction (users must remember to enable) for zero benefit (withImmute is always safe).

### Q2: document? → yes

**why it holds**: this is a behavior change that affects user code. users deserve to know what changed, even if it's backwards compatible.

### Q3: TypeScript types? → return `WithImmute<T>`

**why it holds**: verified via type theory. `WithImmute<T> = T & { clone(...) }` means `WithImmute<T>` is a superset of `T`. any variable typed as `T` can accept `WithImmute<T>`. this is not a type break.

---

## conclusion

found 3 additional questions (Q4-Q6), all answered and added to vision.

original 3 questions (Q1-Q3) verified to hold.

all 6 questions now triaged with [answered] status. no [research] or [wisher] items remain.
