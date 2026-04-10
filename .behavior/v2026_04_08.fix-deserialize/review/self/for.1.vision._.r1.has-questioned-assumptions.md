# self-review: has-questioned-assumptions

## assumptions found in the vision

### assumption 1: "withImmute is safe to always apply"

**what do we assume without evidence?**
that `withImmute` has no side effects and is always safe.

**what evidence supports this?**
- code review shows it only calls `Object.defineProperty` with `enumerable: false`
- non-enumerable properties don't appear in `Object.keys()`, `JSON.stringify()`, or spread
- the property is just a function reference

**what if the opposite were true?**
if withImmute had side effects (e.g., mutated other properties, threw errors), this would be unsafe. but the code shows it doesn't.

**did the wisher say this?**
yes, wisher said "no reason not to" — implies assumption of safety.

**exceptions or counterexamples?**
if object already has `.clone` defined (enumerable or not), `Object.defineProperty` throws. but deserialize creates fresh instances, so this can't happen.

**verdict**: assumption holds. evidence supports it.

---

### assumption 2: "performance is negligible"

**what do we assume without evidence?**
that the performance cost of `Object.defineProperty` per object is acceptable.

**what evidence supports this?**
- `Object.defineProperty` is a primitive operation
- it's O(1) — constant time regardless of object size
- deserialize already does more expensive work (JSON.parse, recursive traversal)

**what if the opposite were true?**
if `Object.defineProperty` were slow (say, 10ms per call), this would be a problem. but it's not — it's microseconds.

**did the wisher say this?**
wisher didn't mention performance, but also didn't say "only if fast". the defect is about correctness, not speed.

**exceptions or counterexamples?**
if deserializing millions of objects, the microseconds add up. but this is already true of all deserialization work.

**verdict**: assumption holds. no evidence of performance concern.

---

### assumption 3: "no one depends on absence of .clone()"

**what do we assume without evidence?**
that no extant code relies on `!('clone' in obj)` or similar checks.

**what evidence supports this?**
- `.clone()` is a useful method, not a marker
- checking for absence of `.clone()` would be unusual
- the wish mentions a defect where `.clone()` was expected but absent

**what if the opposite were true?**
if someone checked `!('clone' in obj)` to detect "raw" instances, this would break. but why would anyone do this?

**did the wisher say this?**
wisher implied it by statement "no reason not to" — if there were reasons, they would have mentioned them.

**exceptions or counterexamples?**
i can't think of a valid reason to depend on `.clone()` absence.

**verdict**: assumption holds. no reasonable counterexample.

---

### assumption 4: "users expect .clone() to be available"

**what do we assume without evidence?**
that users commonly use `.clone()` and expect it on domain objects.

**what evidence supports this?**
- the defect report shows someone tried to use `.clone()` and it failed
- `DomainObject.build()` provides `.clone()` — it's part of the designed api
- `.clone()` is documented in the readme as a feature

**what if the opposite were true?**
if users never used `.clone()`, this fix would be pointless but harmless.

**did the wisher say this?**
yes, the defect report is literally "TypeError: domain.clone is not a function" — user tried to use it.

**exceptions or counterexamples?**
some users might never use `.clone()`. for them, this change is invisible (non-enumerable property).

**verdict**: assumption holds. direct evidence from defect report.

---

### assumption 5: "this is backwards compatible"

**what do we assume without evidence?**
that addition of `.clone()` to deserialized objects won't break extant code.

**what evidence supports this?**
- the property is non-enumerable — doesn't appear in iteration or serialization
- addition of a method is additive — no removal or change of extant behavior
- objects still pass `instanceof` checks

**what if the opposite were true?**
if addition of `.clone()` broke extant code, that code would be unusual (e.g., strict property checks).

**did the wisher say this?**
wisher didn't explicitly say "backwards compatible" but the tone ("fix deserialize") implies it should work with extant code.

**exceptions or counterexamples?**
if someone does `Object.getOwnPropertyNames(obj)` and asserts on the result, they'd now see `clone`. but this is rare and fragile anyway.

**verdict**: assumption holds with minor caveat. `Object.getOwnPropertyNames` would show new property, but this is unlikely to break real code.

---

### assumption 6: "nested objects also need wrap"

**what do we assume without evidence?**
that nested domain objects should also get `.clone()`.

**what evidence supports this?**
- code shows nested objects are also created via `new`, not `.build()`
- if parent has `.clone()` but nested child doesn't, that's inconsistent
- users would expect `obj.nested.clone()` to work if `obj.clone()` works

**what if the opposite were true?**
if we only wrapped top-level objects, users would hit the same error on nested objects.

**did the wisher say this?**
wisher didn't explicitly mention nested objects, but the defect ("domain.clone is not a function") could occur at any nesting level.

**exceptions or counterexamples?**
i can't think of why nested objects should be treated differently.

**verdict**: assumption holds. consistency requires recursive application.

---

## conclusion

all assumptions were questioned. all hold with evidence.

| assumption | holds? | evidence |
|------------|--------|----------|
| withImmute is safe | ✓ | code review |
| performance is negligible | ✓ | O(1) operation |
| no one depends on absence | ✓ | no reasonable usecase |
| users expect .clone() | ✓ | defect report |
| backwards compatible | ✓ | additive change |
| nested objects need wrap | ✓ | consistency |

no hidden assumptions were taken as requirements without evidence.
