# self-review r2: has-questioned-deletables

## feature traceability

### feature 1: add withImmute call in deserialize

**traces to**: vision line 38 — `.clone() works`

**wisher asked for this?**: yes — the defect report in the wish is "TypeError: domain.clone is not a function"

**deletable?**: no — this is the core fix. without this, the wish is not fulfilled.

---

### feature 2: export WithImmute type

**traces to**: vision line 73 — `WithImmute type must be exported from public API`

**wisher asked for this?**: indirectly — the vision derived this from the wish's "no reason not to" stance. users need the type for autocomplete.

**deletable?**: possibly — users could use `ReturnType<typeof deserialize<MyDomain>>`. but this is awkward. the vision explicitly requires it.

**verdict**: keep — explicitly required in vision.

---

### feature 3: update return type to WithImmute<T>

**traces to**: vision lines 66-71 — contract shows `): WithImmute<T>`

**wisher asked for this?**: derived from wish — if runtime has `.clone()`, types should reflect it.

**deletable?**: no — without this, TypeScript would not know about `.clone()`, which creates friction.

---

### feature 4: tests for .clone() availability

**traces to**: criteria usecase.1, usecase.2, usecase.3

**wisher asked for this?**: implicit — tests verify the fix works.

**deletable?**: tests could be minimized. let me examine:

| test | purpose | deletable? |
|------|---------|------------|
| .clone() method after deserialize | verifies fix works | no — core assertion |
| .clone() on cloned instances | verifies chain works | could merge with above |
| .clone() on nested domain objects | verifies nested case | no — edgecase in vision |
| .clone() on each element in array | verifies array case | no — edgecase in vision |

**potential simplification**: merge "preserve .clone() on cloned instances" into the first test.

---

## component traceability

### component 1: deserialize.ts update

**can it be removed?**: no — this is where the fix lives.

**simplest version**: one line change: `return withImmute(new DomainObjectConstructor(obj))`. this is already the simplest.

---

### component 2: index.ts update

**can it be removed?**: only if we don't export WithImmute type. but vision requires it.

**simplest version**: one line: `export type { WithImmute }`. already minimal.

---

### component 3: test updates

**can they be removed?**: no — tests verify the fix.

**simplest version**: reduce number of test cases. currently 4 new tests planned.

**question**: do we need "should preserve .clone() on cloned instances" as a separate test?

**answer**: the vision edgecases table says `.clone() result also has .clone()`. this is a distinct requirement — the cloned result should also be cloneable. keep it.

---

## deletion opportunities found

### opportunity 1: merge test cases

the blueprint lists 4 new tests. could consolidate to 3 by combining:
- "should have .clone() method after deserialize"
- "should preserve .clone() on cloned instances"

into one test that does both assertions.

**verdict**: valid optimization, but keep separate for clarity. each test verifies one specific behavior. the BDD pattern prefers single-assertion tests.

**action**: no change — test separation is better for debugging and maintainability.

---

## conclusion

no features or components are deletable. the blueprint is already minimal:

| item | status |
|------|--------|
| withImmute call | required — core fix |
| export WithImmute | required — vision explicit |
| return type change | required — type accuracy |
| tests | required — verify fix works |

the simplest version that works IS this blueprint.

**final status**: no items to delete
