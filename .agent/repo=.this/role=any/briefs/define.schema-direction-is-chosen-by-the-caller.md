# define.schema-direction-is-chosen-by-the-caller

## .what

a zod schema is a **passive value**. it cannot know where it is used, and it cannot change behavior
based on where it sits.

- a schema does **not** know which **border** it sits at — request or response
- a schema does **not** know whether it is inside `.parse`, `z.toJSONSchema`, or a nested composition
- the **only** context a schema responds to is **direction**, and direction is chosen by **which
  function the caller invokes** — never by the schema

> **a schema has two faces. the caller picks which one, every time. the schema never picks.**

⚠️ **two different axes, easy to conflate.** this brief is about the schema's **side** (wire vs
rich). the **border** (request vs response) is a property of the endpoint, invisible to the schema.
the two do not line up, and `define.contract-usecases` carries that distinction in full.

## .why it matters

this closes a whole family of attractive designs: *"let the schema detect that it is an input schema
and hydrate, and detect that it is an output schema and stay plain."* that design is unreachable,
and the reason is structural rather than a gap someone could patch.

without this stated, the idea gets re-proposed each time a two-faced schema is needed.

## .the two dials, and who turns each

| dial | values | turned by |
|---|---|---|
| **direction** | forward (decode) / backward (encode) | the **function** the caller invokes |
| **io face** (for json-schema emit) | `'input'` / `'output'` | an **argument** the caller passes |

both live at the call site. neither is readable from inside the schema.

```
.parse(x)  /  .decode(x)      → forward   (decode)
z.encode(schema, x)           → backward  (encode)

z.toJSONSchema(schema, { io: 'input' })    → describes what a caller must SEND
z.toJSONSchema(schema, { io: 'output' })   → describes what a parse HANDS BACK  (the default)
```

## .what a schema can actually see

| hook | receives | carries position or direction? |
|---|---|---|
| `.check(fn)` | `{ value, issues }` | ❌ no context at all |
| `.transform(fn, ctx)` | value + an issue sink | ❌ issues only |
| a codec's `decode` / `encode` | the value | ❌ — though *which one runs* is the direction |
| `ParseContext` (the public parse arg) | `error`, `reportInput`, `jitless` | ❌ — and **only** these three |

⚠️ **a custom field on the parse context is silently dropped.** a call of
`schema.parse(x, { myContext: … })` does not throw and does not reach any hook. zod's
`ParseContext` is a closed interface of three options; an extra key is ignored. so an attempt at
context injection fails **quietly**, which is worth a note rather than a rediscovery.

> there is an internal `ParseContextInternal.direction`, marked `@internal`, which is how the engine
> routes encode vs decode. it is not exposed to any user-reachable hook, and a design that reaches
> for it is a design that leans on an undocumented internal.

## .the corollary — one schema CAN serve both faces

the limit is on **self-detection**, not on two-facedness. a `z.codec` genuinely holds both
directions, so a single declaration serves both positions — **provided the caller invokes the right
function at each**:

```ts
const contract = z.codec(wireSchema, z.custom<X>(), {
  decode: (props) => X.build(props),   // wire  → domain
  encode: (x) => ({ ...x }),           // domain → wire
});

contract.parse(wire)           // → an X instance         ✅ the inbound face
z.encode(contract, instance)   // → the plain wire props   ✅ the outbound face
```

**`.parse` runs decode at every border.** so a caller who uses `.parse` on an outbound value
re-hydrates rather than emits the wire shape. the outbound face is reachable only through
`z.encode`, which a caller must choose deliberately.

### ⭐ but that does NOT force a second declaration

the natural next thought is *"one schema, both borders"* requires the framework to call `z.encode`
on its outbound path. **measured, it does not** — a framework may use `.parse` at both borders, on
two conditions a well-built codec already meets:

| condition | why it holds for a dobj codec |
|---|---|
| **decode is idempotent** | decode of an already-rich value yields an equal value, so a re-run is benign |
| **the rich form is wire-equivalent** | the two serialize identically — an added method (e.g. `.clone`) is a function, and `JSON.stringify` skips functions |

so there are **two viable conventions**, not one:

| convention | outbound cost | outbound fidelity |
|---|---|---|
| `.parse` at both borders | one extra decode per response | ✅ same bytes on the wire |
| `.parse` in, `z.encode` out | none | ✅ the principled form |

the second is the honest one and the one a codec is designed for. the first is legitimate, cheap,
and often what a framework already does — so *"the framework parses at both borders"* is a **cost**,
not a disqualification. reach for `z.encode` when you need the wire value in hand; do not add a
second schema declaration merely because the framework parses at both borders.

⚠️ **the two conditions are load-critical, so clamp them.** a codec whose decode is not idempotent,
or whose rich form serializes differently, genuinely does need `z.encode` on the outbound path.

### ⛔ in THIS repo the choice is already made — only convention 1 is reachable

the two conventions above are the general law. for a dobj's `X.contract()`, the first is the only
one available, and the reason is a dependency fact rather than a preference:

`domain-objects` declares zod as a **devDependency** and imports it `import type` only, so
`z.codec` — which needs a *value* import — is out of reach. `.transform()` is reachable from the
author's own schema instance, and **a transform has no backward direction**:

```ts
z.encode(X.contract(), instance)   // ⛔ throws $ZodEncodeError
```

so both clamped conditions are not merely nice-to-have here — they are what makes the surface
usable at all. a later swap to `z.codec` is clean and **additive** (it would only ADD `z.encode`),
which is why the dependency-free form shipped first.

## .the json-schema face has its own limit

`io: 'output'` describes what a parse hands back. if that is a class instance (or any `z.custom`),
json-schema **cannot represent it** and the emit throws. this is accurate, not a defect: the value
genuinely is not json.

three caller-side escapes, in order of preference:

1. `{ io: 'input' }` — correct for a schema that describes what a caller sends
2. `{ unrepresentable: 'any' }` — non-throw, but lossy
3. an `override` hook that swaps the node for the wire schema — full fidelity, most work

## .the test

before you design a schema that "knows" where it is:

> does the knowledge live in the **schema**, or in the **call**?

- in the call → ✅ fine; the caller passes an argument or picks a function
- in the schema → ❌ impossible; the schema is a value with no call context

## .the caveats

- **`ParseContext` is closed** — `error`, `reportInput`, `jitless`. an upstream request for a custom
  context field has been open for years; do not design as though it exists
- **a registry lookup is still caller-side.** `z.registry()` lets a caller attach and read metadata,
  but the schema does not read the registry about itself mid-parse
- **direction is per-call, not per-position.** the same schema object in an inbound and an outbound
  slot is the same value; only the invocations differ
- **this is checked against zod 4.4.3.** the direction/io model is documented and stable, but
  re-verify at a major bump

## .the full table

the two dials cross into four cells. `define.contract-usecases` carries the worked version; the
shape is:

| | **in** side | **out** side |
|---|---|---|
| **describe** it | `z.toJSONSchema(s, { io: 'input' })` | `z.toJSONSchema(s, { io: 'output' })` |
| **produce** it | `z.encode(s, value)` | `s.parse(value)` |

⚠️ note the rows differ in **how** the side is named: an **argument** when you describe, a
**function** when you produce. and `z.toJSONSchema` runs **neither** half of a codec — it takes a
schema, not a value, so there is no payload to decode. `io` picks which child the emit walks.

## .see also

- `define.contract-usecases` — the two contractual concerns of a dobj (instantiation +
  introspection), and which cell each occupies
- `define.subclass-identity-needs-a-call` — the twin limit on the typescript side: a subclass
  reaches a return type only through a call. both say *the call site is where the information is*
- zod docs: codecs (`zod.dev/codecs`), json-schema (`zod.dev/json-schema`)
