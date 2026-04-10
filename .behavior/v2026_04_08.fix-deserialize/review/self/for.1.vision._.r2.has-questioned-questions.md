# self-review: has-questioned-questions

## triage of open questions

### question 1: should this be opt-in via a new option?

**triage**: can be answered via logic now

**answer**: no, always apply. the wish explicitly says "no reason not to". opt-in would add friction for a non-benefit.

**status**: [answered]

---

### question 2: should we document the change?

**triage**: can be answered via logic now

**answer**: yes, changelog entry. this is a behavior change that users should know about. the change is:
- runtime: deserialized domain objects now have `.clone()`
- types: return type changes from `T` to `WithImmute<T>`

**status**: [answered]

---

### question 3: how to handle TypeScript types?

**triage**: was answered via code analysis in previous review

**answer**: change return type to `WithImmute<T>` and export the `WithImmute` type. this is NOT a type break because `WithImmute<T>` extends `T` — any code that expects `T` can receive `WithImmute<T>`.

**status**: [answered]

---

## questions that require wisher input

none. all questions are answered.

---

## questions that require external research

none. this is internal library behavior with no external dependencies.

---

## summary

| question | triage | status |
|----------|--------|--------|
| opt-in? | logic | [answered] no |
| document? | logic | [answered] yes |
| TypeScript types? | code analysis | [answered] return `WithImmute<T>` |

all questions resolved. no blockers to proceed to blueprint.
