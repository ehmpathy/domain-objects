# define.contract-usecases

## .what

a dobj has exactly **two contractual concerns** — the two reasons anything outside the dobj needs
its `.contract()` — and one declaration must serve both:

| # | concern | when | the caller wants | how they ask |
|---|---|---|---|---|
| 1 | **instantiation** | request time, at a boundary | a hydrated dobj instance | `s.parse(wire)` |
| 2 | **introspection** | build / deploy time, for codegen + openapi | the plain wire shape, pragma intact | `z.toJSONSchema(s, { io: 'input' })` |

> **instantiation crosses the boundary. introspection describes it. same declaration, two verbs.**

everything else a dobj offers is an *internal* concern: `.schema` validates, `.build` constructs,
`.clone` derives. those act on a value already on your side. the **contract** is the only surface
aimed outward, and these two are all it is for.

## .why it matters

a second declaration is the defect this surface exists to delete. an sdk that kept a "schema for
codegen" beside a "schema for parse" has two places to drift, and the drift is silent — the
published contract and the enforced contract disagree, and no test catches it because each is
correct on its own terms.

so the requirement is not *"support both"*. it is **one declaration, read twice**.

## .the frame — two verbs × two sides

a contract is a codec, so it has two **sides**. a caller has two **verbs**. every operation is one
of four cells:

| | **in** side (wire json) | **out** side (domain instance) |
|---|---|---|
| **describe** it | `z.toJSONSchema(s, { io: 'input' })` → the wire shape **+ the pragma** ✅ | `z.toJSONSchema(s, { io: 'output' })` → ❌ throws; a class is not json |
| **produce** it | `z.encode(s, instance)` → the wire props | `s.parse(wire)` → a dobj instance |

concern 1 is the bottom-right cell. concern 2 is the top-left. the other two are real and rarely
reached: `z.encode` is a serialize, and the top-right cell is the throw everyone meets first.

**the side is picked differently in each row** — by an **argument** (`io`) when you describe, by a
**function** (`.parse` vs `z.encode`) when you produce. both are caller-side; see
`define.schema-direction-is-chosen-by-the-caller`.

### ⛔ but the bottom-LEFT cell is unavailable on a dobj contract as shipped

the four-cell frame is the general law. `X.contract()` fills three of the four cells; it does **not**
fill `z.encode`.

the reason is a dependency fact, not a design taste: `domain-objects` declares zod as a
**devDependency** and imports it `import type` only, so `z.codec` — which needs a *value* import —
is out of reach. what is reachable from the author's own schema instance is `.transform()`, and a
transform has no backward direction:

```ts
z.encode(X.contract(), instance)   // ⛔ throws $ZodEncodeError — no backward direction
```

**so a consumer uses `.parse` at BOTH borders.** that is safe on two conditions this repo clamps:

| condition | why it holds |
|---|---|
| decode is **idempotent** | a re-parse of an already-rich value converges to an equal value |
| the rich form is **wire-equivalent** | `JSON.parse(JSON.stringify(instance))` equals the wire — an added method is a function, and `JSON.stringify` skips functions |

the cost is one extra decode per response; the bytes are identical. a later swap to `z.codec` is
clean and **additive** — it would only ADD `z.encode` — which is why the dependency-free form
shipped first.

## .why introspection wants the INPUT face

this reads backwards until you name what `io` means:

```
io: 'input'   = describe the PRE-coercion face   → what a caller must SEND
io: 'output'  = describe the POST-coercion face  → what a parse HANDS BACK
```

a published contract tells a **caller** what to send. that is the pre-coercion face. so
introspection is not a second, rival concern — it is **the same input boundary, asked about rather
than crossed**.

⚠️ **and the `x-domain-object` pragma lives on the IN side.** so `{ io: 'input' }` is correct on two
independent grounds: it is the only face that emits at all, *and* the only face that carries the
pragma a downstream codegen reads. even a hypothetical representable out-side would emit a
pragma-less document.

## ⚠️ "input" does double duty — two senses, one word

this is the single easiest mistake to make, because the word is overloaded across two levels:

| the word | scope | values |
|---|---|---|
| **border** | the **endpoint** — which way a message travels | request (`input`) / response (`output`) |
| **side** | the **contract** — which face of the codec | wire (`in`) / instance (`out`) |

> **`io` names the SIDE of the contract. it never names the BORDER of the endpoint.**

so an endpoint that declares both borders emits **both** with `{ io: 'input' }`:

```ts
const contract = {
  input:  z.object({
    surfer:    Surfer.contract().ref(),
    surfboard: Surfboard.contract(),
  }),
  output: z.object({
    reservation: SurfboardReservation.contract(),
  }),
};

z.toJSONSchema(contract.input,  { io: 'input' });   // ✅ what the CALLER supplies
z.toJSONSchema(contract.output, { io: 'input' });   // ✅ what the ENDPOINT supplies back
```

read the two the same way — *the wire shape at that border*:

| border | whose value crosses | `{ io: 'input' }` describes |
|---|---|---|
| **input** (request) | the caller's | what a caller must send |
| **output** (response) | the endpoint's | what the endpoint hands back |

### the trap

`{ io: 'output' }` on the **output** border reads natural and is wrong. it asks for the *contract's*
out side — the hydrated instance — which is not json, so the emit **throws**. the symmetry the eye
expects (`input` border → `io: 'input'`, `output` border → `io: 'output'`) does not exist, because
the two words are about different things.

the rule is therefore blunt and easy to hold:

> **every emit, at every border, passes `{ io: 'input' }`.** unconditionally. there is no position
> where the other value is correct.

that is why the flag belongs in an sdk's emit helper as one line, rather than as a per-schema
judgment. it is also safe on a position with no codec at all — for a plain schema the two faces
differ by exactly one key (`additionalProperties: false`), pragma and `required` identical.

## .`toJSONSchema` runs NEITHER half of the codec

the common wrong model is *"`io: 'input'` skips the decode."* it does not, because no decode was
ever scheduled:

```ts
z.toJSONSchema(s, { io })   // takes a SCHEMA. no value. no payload. no decode, no encode.
s.parse(value)              // takes a VALUE. this is the only call that runs decode.
```

`toJSONSchema` is a static walk of the schema's type graph (`_zod.def`). `io` selects which child
of the codec node the walk descends — the `in` schema or the `out` schema. it is the document-level
twin of a choice typescript already makes at the type level:

```
z.input<typeof s>    ←→   z.toJSONSchema(s, { io: 'input' })
z.output<typeof s>   ←→   z.toJSONSchema(s, { io: 'output' })
```

both are reads *about* the schema, never runs *of* it.

## .why `io` exists at all

because a schema that transforms genuinely has **two different types**, and a json-schema document
declares **one**. when `z.input` and `z.output` diverge, the emit must be told which it describes.

for a schema with no transform the two faces nearly coincide — measured, the delta is exactly one
key (`additionalProperties: false`, present under `'output'`), pragma and `required` identical. that
near-identity is why `io` reads as noise until a codec appears.

**the default is `'output'`**, which is wrong for a published contract and right for zod's primary
view (*"describe the value my code holds after a parse"*). so an sdk sets `{ io: 'input' }` once, in
its emit helper, unconditionally.

## .the test

before you add a second schema declaration, ask:

> is this a different **contract**, or the same contract read by a different **verb**?

- a different verb → ✅ one declaration; pick the cell
- a different contract → a genuinely different boundary, which earns its own declaration

## .the caveats

- **`{ io: 'input' }` is unconditional.** it is safe on every position, codec or not, so it is one
  edit in an emit helper rather than a per-position judgment
- **the `io: 'output'` throw is accurate, not a defect.** `'output'` asks what a parse hands back,
  and a coerce exists precisely to hand back a value that is not json. any design that satisfied it
  would have stopped to yield an instance
- **three caller-side escapes exist**, in order of preference: `{ io: 'input' }` (correct),
  `{ unrepresentable: 'any' }` (non-throw but lossy), an `override` hook that swaps the node for the
  wire schema (full fidelity, most work)
- **`.schema` is not a third concern.** `.schema` validates a value already on your side of the
  boundary; `.contract()` is what crosses it. `.schema` is also untyped and may be joi/yup
- ⛔ **there is no `z.encode` on a dobj contract.** it ships as a `.transform()`, not a `z.codec`,
  because this repo has no runtime schema dependency. use `.parse` at both borders — safe on the two
  clamped conditions above
- **checked against zod 4.4.3.** the `io` model is documented and stable; re-verify at a major bump

## .see also

- `define.schema-direction-is-chosen-by-the-caller` — why the caller, never the schema, picks a face
- `define.subclass-identity-needs-a-call` — why the contract is reached by a call, not a property
- zod docs: codecs (`zod.dev/codecs`), json-schema (`zod.dev/json-schema`)
