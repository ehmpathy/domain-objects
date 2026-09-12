# define.subclass-identity-needs-a-call

## .what

a dobj static can only carry its subclass's identity into a return type through a **call**.

- `X.someStatic()` — a call on the class. `this` binds to `X`, so the return type can name `X`
- `X.someStatic.someMethod()` — a property chain. `this` binds to whatever the property yielded,
  so the return type cannot name `X`

> **typescript carries a subclass's identity through a call, never through a property access.**

## .why

`schema`, `contract`, `nested` and their kin are **statics**. the type of `X.someStatic` is looked up
on the base class's static side, where no member can mention `X` — the limit `DomainObject` records
on its `schema` declaration: *"typescript's static members cant reference class type parameters"*.

a static getter takes no `this` parameter and cannot be generic, so whatever it yields is typed
once, for the base, and every subclass reads that one type. `X` is therefore lost **at the property
access** — one step before any method on the result is reached.

a call is different: a method may declare a `this` parameter, and at a call site typescript binds it
to the actual receiver. that binding is the only channel through which a subclass reaches a return
type.

## .the shapes, and what each yields

| shape | yields |
|---|---|
| static getter returning a type built from `InstanceType<typeof this>` | the **base**, not the subclass |
| static method returning a type built from `InstanceType<typeof this>` | the **base**, not the subclass |
| static getter that declares a `this` **type** | `TS2526` — a `this` type is banned in a static |
| base that declares a static from its own class type parameter | `TS2302` |
| method with a `this` **param**, reached by property chain | `TS2684` — `this` is the property's value |
| method with a `this` **param**, called on the class | ✅ the **subclass** |

`DomainObject.build` and `helpful-errors`' `HelpfulError.throw` both sit on the last row. they work
for one reason: they are invoked **on the class**.

## .the split — when a chain is fine

a property chain is not forbidden. it is only incapable of one thing.

| a chained method whose return type… | a property chain is |
|---|---|
| does not name the dobj (`any`, or a fixed shape) | ✅ fine, and cheaper to read |
| names the dobj | ❌ impossible — it needs a call on the class |

so the question is never *"may i chain?"* but *"does this return type need the dobj?"* if it does,
the chain was never available.

## .the corollary — an `any` return can be a symptom

when a chained method returns `any`, consider whether its type was **surrendered** because the
access shape could not carry it. a property chain makes that surrender look ordinary: the method
compiles, the chain reads well, and the erasure is invisible at the call site.

the diagnostic: check whether a type that would name the dobj already exists in `src/reference/`
(`Ref`, `RefByPrimary`, `RefByUnique`) or could be written. if one does, the `any` is a cost of the
access shape, not a fact about the operation.

## .capture the class, not the instance

a `this` parameter may capture the instance type or the class type. **capture the class** — it
carries both faces, while the instance carries only its own:

| what the return type needs | from `TClass` | from `TInstance` |
|---|---|---|
| the instance shape | `InstanceType<TClass>` ✅ | ✅ |
| the key **names** (`primary`, `unique`) | ✅ they are class statics | ❌ unreachable |

this decides what a surface can express. `RefByPrimary<TDobj>` derives from `TDobj['primary']` — a
**static**. an instance type knows its fields but not which of them are its keys, so a reference
derived from the instance alone degrades to every field at once, which is the whole object rather
than a reference to it.

one capture of the class therefore serves a whole surface: `InstanceType<TClass>` types the
instance-shaped members, and the same `TClass` types the key-shaped ones.

```ts
<TClass extends ConstructorOf<any>>(this: TClass): SomeShapeOf<TClass>
```

⚠️ **bound the parameter permissively; put the key demand in a conditional.** `Refable` is the type
that names the two key statics, so it is the bound one reaches for first — but it demands `primary`
and `unique` by **presence**, and a keyless `DomainLiteral` declares neither. bound directly on it,
the whole surface becomes uncallable on such a class. so the bound is the permissive
`ConstructorOf<any>` (the repo's extant constructor type), and `Refable` gates only the members that
genuinely need a key:

```ts
type RefOf<TClass> = TClass extends Refable<any, any, any> ? Ref<TClass> : any;
```

the degrade then lands exactly where a key type cannot be derived, and nowhere else.

where only the instance shape is needed, the narrower construct-signature form suffices — the form
`DomainObject.build` uses — intersected with `DomainObjectClass` when the implementation must also
read `.schema` / `.name` / `.primary`:

```ts
<TInstance>(
  this: (new (props: TInstance, options?: DomainObjectInstantiationOptions) => TInstance)
      & DomainObjectClass,
): SomethingOf<TInstance>
```

## .a call can live under a property

a value may be **both** a zod schema and callable, so a getter can keep yielding a schema while also
accepting a call. the construction: make a function, re-point its prototype at the schema's
prototype, and copy the schema's own property descriptors onto it. the result answers `true` to
`instanceof ZodType` while `typeof` reports `'function'`.

⚠️ this holds only because zod identifies a schema by its **prototype chain** rather than by
`typeof`. that is an implementation detail of a dependency, not a documented guarantee — so any
surface built on it owes a regression test and a re-check at each zod upgrade.

### ⛔ this repo measured that bridge and REJECTED it

the construction above is real and it works. it is recorded because the mechanism is worth knowing,
**not** as a recommendation — `X.contract` ships as a plain function, `instanceof ZodType === false`,
and that `false` is the point:

| at a `z.object({ x: <it> })` position | plain function (shipped) | the bridge |
|---|---|---|
| what a parse does | ✅ **throws** — *"expected a Zod schema"* | ❌ **parses fine — the footgun succeeds** |
| rests on a zod internal | no | yes |

the bridge existed only to keep a bare property alive as a schema for backcompat. once that property
was removed, the bridge went with it — and the surface that once quietly accepted the un-called form
now refuses it loudly. **prefer a loud refusal over a silent success**: reach for the bridge only
where a caller genuinely must pass the same value to both a call site and a schema position, and
never merely to spare a caller two parens.

## .the caveats

- **a detached receiver is refused at COMPILE, not silently widened.** `const c = X.someStatic; c()`
  supplies `void` for `this`, which cannot satisfy a `this` parameter bound on a constructor type —
  so the detach is a compile error, and the surface cannot quietly lose its type. measured, not
  assumed; clamped at `getContract.coerce.test.ts` with a **consumed** `@ts-expect-error`, so the
  day the bound widens enough to admit a detached call, `tsc` fails on the unused directive
  - ⚠️ this holds only where the `this` bound is a real type. bound it on `any`, or read `this`
    with `noImplicitThis` off, and the detach does widen silently — that shape is what this caveat
    was first written about, and it was written too broadly
  - the companion runtime demand — *"fail loud when `this` lacks the statics it reads"* — is **moot**
    for an implementation that closes over its subject rather than reads `this` at runtime. such a
    detached call is still **correct**, merely refused by the compiler. prefer that: a compile
    refusal plus a correct runtime beats a runtime throw on both axes
- **an explicit type argument can lie.** `X.someStatic.method<OtherDobj>()` compiles and returns the
  wrong class. prefer inference from the receiver over a hand-supplied parameter
  (`rule.require.pitofsuccess`)
- **a zod chain op drops added methods.** `.optional()` / `.nullable()` yield a fresh schema without
  any method hung onto the original — the hazard `getContract` documents for `.ref`. it applies to
  every method added to a contract
- **`Refable` demands `primary` and `unique` by PRESENCE**, which a keyless `DomainLiteral` declares
  neither of — and an `any` type **argument** does not excuse an absent **member**, so such a dobj
  fails the constraint outright. that is why the bound sits on `ConstructorOf<any>` and `Refable`
  gates only the key-shaped members, which degrade to a loose type there rather than make the whole
  surface uncallable. measured, not assumed — clamped at
  `getContractRef.matrix.test.ts`, table E

## .the test

before you add a chained method to a dobj static surface, ask:

> does its return type have to name the dobj?

- **no** → a property chain is fine
- **yes** → it must be a call on the class, or the type erases to the base

## .see also

- `DomainObject.schema` — the declaration whose note records the underlying typescript limit
- `DomainObject.build` — the in-repo precedent for the `this`-param lever
- `getContract` — the chain-order hazard this compounds with
- `src/reference/` — `Ref`, `RefByPrimary`, `RefByUnique`: the types that name a dobj's keys
- `rule.require.pitofsuccess` (mechanic) — why a hand-supplied type argument is the weaker option
