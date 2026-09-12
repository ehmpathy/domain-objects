# handoff → `ehmpathy/sdk-aws-lambda#17`: emit every schema with `{ io: 'input' }`

> **self-contained by design.** you are in `sdk-aws-lambda` and have not read the `domain-objects`
> vision that produced this. all you need is below; no cross-repo lookup required.
>
> origin: `ehmpathy/domain-objects` · bound `v2026_08_10.feat-contract-coerce` · stone `1.vision`

---

## .tldr

`#17` is real, still needed, and **its stated fix is half right**. the correction is one word:

```ts
// #17 as written today
z.toJSONSchema(schemaInput,  { io: 'input' });   // ✅ correct
z.toJSONSchema(schemaOutput);                    // ⛔ "correctly stays io: 'output'" — WRONG

// what it must be
z.toJSONSchema(schemaInput,  { io: 'input' });   // ✅
z.toJSONSchema(schemaOutput, { io: 'input' });   // ✅ the OUTPUT border takes the flag too
```

**every emit, at every border, gets `{ io: 'input' }`.** unconditionally.

## .what changed upstream

`domain-objects` is about to ship a break to `.contract`. the surface becomes:

```ts
X.contract                   // ⛔ REMOVED as a schema — it is now a plain function
X.contract()                 // the boundary. coerces: parses wire json → a hydrated X instance
X.contract().ref()           // key-only reference; the union of the declared key grains
X.contract().ref('primary')  // → { uuid: string }
X.contract().ref('unique')   // → { name: string }
```

three consequences for this repo:

1. `.contract` **always coerces** now — a position that used to parse to a plain object parses to an
   instance. `z.infer` there names the class instead of `any`
2. every `.contract` position becomes a **two-faced** node, whose out face cannot be described under
   zod's default `io: 'output'` — hence `#17`
3. the migration is mechanical and compile-time loud: `X.contract` → `X.contract()`,
   `.contract.ref(by)` → `.contract().ref(by)`, `.ref('ref')` → `.ref()`

## .why the throw happens

`z.toJSONSchema(schema, { io })` picks which **face of the schema** the emitted document describes.
a coerce has two, and only one is json:

```
io: 'input'    → what a CALLER must send    → the plain wire object    ✅ representable
io: 'output'   → what a PARSE hands back    → an X INSTANCE            ❌ not representable
```

`'output'` is zod's **default**, so a bare `z.toJSONSchema(schema)` asks for the face that cannot
exist as json, and throws.

⚠️ **this is accurate, not a zod defect.** `'output'` genuinely asks what a parse hands back, and the
whole point of the coerce is to hand back a class instance. any design that satisfied `io: 'output'`
would have stopped to yield an instance — measured: an out-side that is a real object schema *does*
emit, **by destruction of the instance**. so a clean emit is not evidence of a correct contract.

## ⚠️ .the correction — "input" does double duty

this is the part `#17` gets wrong, and it is the likeliest way a half-fix ships: the input border
works, the output border still throws, and the crash surfaces at a **different** handler than the
one you touched.

the word `input` is overloaded across two levels, and they do **not** line up:

| the word | scope | values |
|---|---|---|
| **border** | the **endpoint** — which way a message travels | request (`input`) / response (`output`) |
| **side** | the **contract** — which face of the codec | wire (`in`) / instance (`out`) |

> **`io` names the SIDE of the contract. it never names the BORDER of the endpoint.**

so for a two-border endpoint:

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

| border | whose value crosses | `{ io: 'input' }` describes |
|---|---|---|
| **input** (request) | the caller's | what a caller must send |
| **output** (response) | the endpoint's | what the endpoint hands back |

`{ io: 'output' }` on the output border reads natural by symmetry and **throws**. the symmetry the
eye expects does not exist, because the two words are about different levels.

## ⚠️ .the second correction — the crossed test must use a REAL `.contract()` position

`#17`'s acceptance calls for a crossed test, and its stated case (`case6`) exercises a hand-rolled
`.transform()`.

**shipped (measured, not predicted): `X.contract()` is a `.transform()`, not a `z.codec`.** the
reason is a dependency fact, not a design preference — `domain-objects` has no runtime schema
dependency (zod/joi/yup are devDependencies only, and every non-test `src/` zod import is
`import type`), so `z.codec` is unreachable without a value import that would make zod a runtime
dep. `.transform()` is reachable from the schema instance the author already handed us.

so the throw message `#17` will meet is the transform one:

```
"Transforms cannot be represented in JSON Schema"
```

⚠️ **what this changes for an adopter:**

| | shipped (`.transform()`) | had it been `z.codec` |
|---|---|---|
| `X.contract().parse(wire)` → an instance | ✅ | ✅ |
| `z.toJSONSchema(…, { io: 'input' })` → wire shape + pragma | ✅ | ✅ |
| `z.toJSONSchema(…)` under the default `io` | ⛔ throws | ⛔ throws |
| **`z.encode(X.contract(), instance)` → the wire props** | ⛔ **unavailable** | ✅ |

the last row is the one to plan around: **there is no encode.** an sdk therefore uses `.parse` at
**both** borders, which is safe on two clamped conditions this repo now asserts — decode is
idempotent (a re-parse of an already-rich value converges), and the rich form is wire-equivalent
(`JSON.parse(JSON.stringify(instance))` equals the wire, since an added method is a function and
`JSON.stringify` skips functions). the cost is one extra decode per response; the bytes are the same.

> a later swap to `z.codec` is clean and additive — it would only ADD `z.encode`. the reverse would
> not be, which is why the dependency-free form shipped first.

> **the crossed test should use a real `X.contract()` position**, on a real dobj, not a hand-rolled
> transform — so it exercises the shipped node, not a look-alike.

## .why this is service-wide, not per-handler

`getAllLambdaContracts` walks **every** handler. so one adopted `.contract()` position anywhere in
the service takes down introspection for the **whole** service on the next `prep` deploy. the blast
radius is not proportional to adoption.

and the throw comes from **zod**, so its message cannot name our fix — an adopter who has not read
this gets a crash that points nowhere useful.

## .the fix, concretely

one edit in the emit helper (`getJsonSchemaFromZod`), applied unconditionally:

```ts
- z.toJSONSchema(schema)
+ z.toJSONSchema(schema, { io: 'input' })
```

**it is safe on every position, coerced or not.** measured on a plain (non-coerced) contract — a
`.ref()`, which is a flat pick with no transform: the two emits differ by exactly one key —
`additionalProperties: false`, present under `'output'`, absent under `'input'`. pragma and
`required` are byte-identical otherwise. so this is one line, not a per-schema judgment, and it
independently reproduces `#17`'s own "codegen-neutral" claim.

## .acceptance

- every `z.toJSONSchema` call in this repo carries `{ io: 'input' }` — **input and output borders
  alike**; zero bare calls remain
- ⭐ a crossed test declares a **two-border** endpoint contract whose positions are real
  `X.contract()` / `X.contract().ref()` values, and asserts:
  - both borders emit under `{ io: 'input' }` without a throw
  - the `x-domain-object` pragma survives on both
  - **either** border under `{ io: 'output' }` **throws** — so the clamp goes red if someone
    re-couples `io` to the border
- the emitted typescript is unchanged for every extant handler (the codegen-neutral claim, verified
  rather than assumed)
- a lint rule or a wrapped helper makes a bare `z.toJSONSchema(schema)` hard to write again —
  otherwise the next author re-introduces it, and the failure is service-wide

## .escape hatches, if the fix cannot land at once

both are caller-side, in order of preference:

1. `{ unrepresentable: 'any' }` — non-throw, but emits a loose `{}`. **lossy for codegen**; a bridge,
   not a destination
2. an `override` hook that swaps the transform node for
   `z.toJSONSchema(X.contract(), { io: 'input' })` — full fidelity, most work

there is **no schema-side fix.** a schema is a passive value with no knowledge of which call it sits
inside, so it cannot pre-authorize an emit it cannot see. `.meta()` was tested and does not help.

## .what is NOT in scope here

- the `domain-objects` migration itself (`X.contract` → `X.contract()`) — that lands with the
  upstream release and is compile-time loud
- `rule.forbid.event-as-cast` at the handler invoke boundary — a separate task
  (`rhachet-roles-ehmpathy#537`)

## .evidence — executed, not argued

verified against `domain-objects@0.33.0` + `zod@4.4.3`, in the `domain-objects` repo:

| claim | evidence |
|---|---|
| default `io` is `'output'` | `zod/v4/core/to-json-schema.ts:130` — `io: params?.io ?? "output"` |
| ⭐ **the SHIPPED node is a `.transform()`, not a `z.codec`** | `domain-objects` has no runtime schema dep (zod is a devDependency; every non-test `src/` zod import is `import type`), and `z.codec` needs a value import. measured: a `z.object` instance exposes 55 methods — `transform` yes, `codec` **no** |
| ⭐ the shipped throw message | *"Transforms cannot be represented in JSON Schema"* — reproduced against the real `X.contract()`, at the root AND nested in a parent `z.object` |
| a `z.codec` would have thrown a **different** message | *"Custom types cannot be represented in JSON Schema"* — noted so a message-matched assertion is not written against the wrong one |
| ⛔ **`z.encode` is unavailable** | a transform has no backward direction; it throws `$ZodEncodeError`. use `.parse` at both borders |
| `.parse` at both borders is safe | decode is idempotent, and the rich form is wire-equivalent — both now clamped upstream in `getContract.coerce.test.ts` |
| `{ io: 'input' }` emits the wire shape **with** the pragma | reproduced, incl. through an array item and a nested dobj |
| the pragma lives on the **in** side | the transform is a pipe whose `in` is the stamped `z.object`; `io` selects which child the emit walks |
| `{ io: 'input' }` is safe universally | on a `.ref()` (no coerce) the delta is exactly `additionalProperties: false`; byte-identical otherwise |
| one declaration serves both concerns | from a single schema object: `{ io: 'input' }` yields the wire shape + pragma, and `.parse` yields a hydrated instance |
| `{ unrepresentable: 'any' }` is a non-throw escape | reproduced; emits a loose schema |
| the `override` hook is a full-fidelity escape | reproduced; emits the full wire shape |
| `.meta()` does **not** help | reproduced; still *"Custom types cannot be represented"* |

## .the HOW is yours

`.what` / `.why` / `.acceptance` are authoritative. the shape of the emit helper, whether the guard
is a lint rule or a wrapper, and the layout of the crossed test are all yours to choose. if you
deliver the acceptance with a shape this handoff did not imagine, that is a success — say why in
your yield.

---

dispatched by seaturtle 🐢 + human
