# self-review r4: has-pruned-yagni

## component-by-component yagni check

### component 1: withImmute call in deserialize

**was this explicitly requested?** yes — wish says "always add withImmute, no reason not to"

**is this minimum viable?** yes — one function call wraps the instance

**verdict**: required, not yagni

---

### component 2: WithImmute type export

**was this explicitly requested?** yes — vision line 73: "WithImmute type must be exported from public API"

**is this minimum viable?** yes — one export statement: `export type { WithImmute } from './manipulation/immute/withImmute';`

**verdict**: required, not yagni

---

### component 3: return type change to WithImmute<T>

**was this explicitly requested?** yes — vision Q3: "change return type to WithImmute<T>"

**is this minimum viable?** yes — just a type annotation change

**could we skip this?** no — without it, TypeScript wouldn't know `.clone()` exists

**verdict**: required, not yagni

---

### component 4: applyWithImmuteToTree recursive helper

**was this explicitly requested?** implicitly yes — criteria usecase.3 requires nested domain objects each get `.clone()`

**is this minimum viable?** let me question this...

**alternatives considered**:
1. no recursion (simpler) → fails usecase.3
2. modify `hydrateNestedDomainObjects` → affects ALL instantiation, not just deserialize
3. pre-process JSON before constructor → complex, conflicts with hydration logic

**is the helper over-engineered?**
- the helper handles 3 cases: domain objects, arrays, plain objects
- all 3 cases are required for nested structures
- no "just in case" branches

**could a simpler approach work?**
- inline the logic at call site? no cleaner — same logic required
- skip array handler? no — criteria usecase.2 requires arrays

**verdict**: required for criteria, minimum viable implementation

---

### component 5: 4 new tests

**trace each test to requirement**:

| test | traces to |
|------|-----------|
| .clone() method after deserialize | usecase.1 |
| .clone() on cloned instances | vision edgecase |
| .clone() on nested domain objects | usecase.3 |
| .clone() on each element in array | usecase.2 |

**are any tests redundant?**
- tests 1 and 2 both verify .clone() but test different properties (availability vs chain behavior)
- tests 3 and 4 verify different structures (nested vs array)

**could we have fewer tests?**
- a merge would obscure which case fails when issues arise
- each test is focused on one distinct behavior

**verdict**: all tests trace to requirements, no extras

---

## "while we're here" check

**did we add any features beyond the wish?**
- no new API options
- no new parameters
- no configurability
- no performance optimizations beyond minimum

**did we add abstraction "for future flexibility"?**
- `applyWithImmuteToTree` is not abstracted — it's inlined in deserialize.ts
- no separate module for the helper
- no exported interface for extensibility

---

## pre-optimization check

**did we optimize before we knew it was needed?**
- no cache of wrapped objects
- no memoization
- no lazy application
- withImmute is O(1) — no optimization needed

---

## conclusion

all components trace to explicit requirements:
- wish → "always add withImmute"
- vision → type export, return type change
- criteria → nested objects, arrays, single objects

no extras found. blueprint is minimum viable.

**status**: no yagni items to prune
