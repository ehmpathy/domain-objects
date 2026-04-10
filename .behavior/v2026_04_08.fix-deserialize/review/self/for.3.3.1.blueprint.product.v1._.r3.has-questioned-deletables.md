# self-review r3: has-questioned-deletables

## deeper examination

the r2 review concluded "no items to delete" too quickly. let me challenge each component more aggressively.

---

## challenge: export WithImmute type

**current**: blueprint says export `WithImmute` from index.ts

**challenge**: is this truly needed? users can do:
```ts
type MyResult = ReturnType<typeof deserialize<MyDomain>>;
```

**counter**: that's awkward. the vision explicitly says "WithImmute type must be exported from public API" (line 73).

**deeper question**: why does the vision require this?

**answer from vision Q3**:
> change return type to `WithImmute<T>` and export `WithImmute` type. this is NOT a type break because `WithImmute<T>` extends `T`.

the export enables users to explicitly type their variables:
```ts
const domains: WithImmute<MyDomain[]> = deserialize(...)
```

**can we delete this?**: no — the vision explicitly requires it. delete would violate the vision contract.

---

## challenge: 4 new tests

**current**: blueprint plans 4 new tests

**challenge**: can we reduce to 2?

let me trace each test to requirements:

| test | traces to |
|------|-----------|
| .clone() after deserialize | usecase.1, vision "after" scenario |
| .clone() on cloned instances | vision edgecase ".clone() result also has .clone()" |
| .clone() on nested | usecase.3, vision edgecase "nested domain objects" |
| .clone() on array elements | usecase.2, vision edgecase "arrays of domain objects" |

**can we merge tests?**

- tests 1+2: could merge, but they test different behaviors (availability vs chain behavior)
- tests 3+4: could merge with test 1, but they verify distinct edgecases

**decision**: these are distinct behaviors from the vision. a merge would obscure which case fails when issues arise.

**can we delete any?**: no — each traces to a distinct vision edgecase.

---

## challenge: notes section in blueprint

**current**: blueprint has "notes" section with 3 subsections

**challenge**: is this documentation needed for execution?

**subsections**:
1. "why no nested recursion needed" — explains implementation decision
2. "why return type is WithImmute<T>" — traces to vision answer
3. "backward compatibility" — summarizes impact

**can we delete this?**:

- section 1: needed — without it, implementer might add unnecessary nested recursion
- section 2: helpful but could inline to type signature section
- section 3: helpful but could delete — vision already covers this

**action**: could simplify notes to just section 1 (the non-obvious implementation detail).

---

## issue found: notes section bloat

**problem**: notes section has 3 subsections, only 1 is essential.

**fix**: reduce to essential note only.

**before**:
```
## notes

### why no nested recursion needed
(explanation)

### why return type is WithImmute<T>
(traces to vision)

### backward compatibility
(summary)
```

**after**:
```
## notes

### why no nested recursion needed
(explanation — this is the only non-obvious part)
```

the other two notes duplicate information from vision and implementation details.

---

## updated blueprint changes

**to fix**: remove notes sections 2 and 3 from blueprint.

**rationale**: "why return type is WithImmute<T>" and "backward compatibility" are already covered in:
- vision Q3 answer
- implementation details section
- vision "evaluation" section

duplicated content creates maintenance burden.

---

## conclusion

found one issue: notes section has redundant subsections.

**fix applied**: removed redundant notes from blueprint:
- deleted "why return type is WithImmute<T>" (duplicates vision Q3)
- deleted "backward compatibility" (duplicates vision evaluation)
- kept only "why no nested recursion needed" (non-obvious implementation detail)

all features and components trace to requirements. the one simplification opportunity found was documentation, not code.

**final status**: one simplification found and fixed (notes bloat removed)
