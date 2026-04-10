# self-review r2: has-questioned-assumptions

## deeper review with fresh eyes

### issue found: inaccurate claim about idempotency

**where**: vision line 127
> "already has .clone() | withImmute is idempotent, safe to call twice"

**the problem**: this claim is FALSE. from `withImmute.ts`:

```ts
Object.defineProperty(obj, 'clone', {
  enumerable: false,
  configurable: false,  // <-- NOT idempotent!
  writable: false,
  value: ...
});
```

with `configurable: false`, a second `Object.defineProperty` call on the same property throws `TypeError: Cannot redefine property: clone`.

**why it's still safe**: in the context of deserialize, this doesn't matter because:
1. deserialize creates NEW instances via `new DomainObjectConstructor()`
2. fresh instances don't have `.clone()` yet
3. we apply `withImmute` exactly once per instance

**fix needed**: the vision should NOT claim idempotency. instead it should clarify:
- deserialize creates fresh instances
- fresh instances don't have `.clone()`
- withImmute is applied once per fresh instance

**action**: update the vision edgecases table.

---

### issue found: unclear mental model

**where**: vision line 84
> "if i serialized an object with .clone(), i get back an object with .clone()."

**the problem**: this implies preservation. but actually:
1. user could create via `new Spaceship({...})` — NO `.clone()`
2. serialize it
3. deserialize it — NOW has `.clone()` (with the fix)

so users get MORE than they put in, not "the same".

**why it matters**: the mental model should be accurate to set correct expectations.

**fix needed**: clarify that deserialize returns "fully-featured" objects, not just "what you put in".

---

### assumption re-examined: withImmute is safe

**evidence verified**:
- `Object.defineProperty` with `configurable: false, writable: false, enumerable: false`
- property is non-enumerable: doesn't appear in `Object.keys()`, `for...in`, `JSON.stringify()`
- property is not writable: can't be overwritten
- property is not configurable: can't be redefined (throws if attempted)

**new insight**: the non-configurability is actually a safety feature — prevents accidental override of `.clone()`.

**verdict**: still safe, with nuance about non-idempotency.

---

### assumption re-examined: all domain object types benefit

**checked**: DomainEntity, DomainLiteral, DomainEvent

**evidence**: all extend DomainObject, all can use `.clone()` for immutable updates.

**verdict**: holds. all types benefit.

---

### assumption re-examined: deserialize is the primary fix location

**question**: are there other places where domain objects are created without `.clone()`?

**found**:
- `hydrateNestedDomainObjects` — but called from constructor, which is called from deserialize
- direct `new DomainObject()` — by design, raw instantiation doesn't add `.clone()`

**verdict**: deserialize is the right place. direct `new` is intentionally "raw". deserialize should match `.build()` behavior.

---

## fixes applied to vision

### fix 1: removed false idempotency claim

**before** (vision line 127):
```
| already has .clone() | withImmute is idempotent, safe to call twice |
```

**after**:
```
| fresh instances from deserialize | safe to wrap (no prior .clone() property) |
```

**lesson**: verify claims about runtime behavior by reading the implementation. `configurable: false` means the property cannot be redefined.

---

### fix 2: clarified mental model

**before** (vision line 84):
```
> "if i serialized an object with .clone(), i get back an object with .clone()."
```

**after**:
```
> "deserialize gives me fully-featured domain objects, ready to use. i don't have to remember to wrap them."
```

**lesson**: mental models should describe what users GET, not preservation semantics. users get MORE than raw instantiation — that's the value.

---

## assumptions that hold (with evidence)

### withImmute is safe

**why it holds**: verified in code — only adds non-enumerable, non-configurable, non-writable property. doesn't affect serialization, iteration, or equality.

### all domain object types benefit

**why it holds**: DomainEntity, DomainLiteral, DomainEvent all extend DomainObject. all can use `.clone()` for immutable updates.

### deserialize is the right fix location

**why it holds**: direct `new` is intentionally "raw" — users choose `.build()` for full features. deserialize should match `.build()` because users expect full features back from serialization round-trip.

### no one depends on absence of .clone()

**why it holds**: can't find a reasonable usecase. `.clone()` is non-enumerable, so it doesn't affect property iteration or serialization.

---

---

### NEW issue found: TypeScript types don't reflect runtime behavior

**where**: vision lines 62-70 (contract section)

**the problem**: the vision says:
```ts
// output: now includes .clone() on all domain objects
// (return type unchanged, but instances have .clone())
```

but "return type unchanged" means TypeScript won't know about `.clone()`:

```ts
const ship = deserialize<Spaceship>(serial, { with: [Spaceship] });
ship.clone({ fuel: 100 }); // TypeScript ERROR: Property 'clone' does not exist
```

**deeper analysis**:

is changing return type to `WithImmute<T>` actually a type break?

```ts
type WithImmute<T> = T & { clone(...): WithImmute<T> }
```

`WithImmute<T>` is a SUPERSET of `T`. therefore `WithImmute<T>` is assignable to `T`:

```ts
// after change:
const ship = deserialize<Spaceship>(...);  // WithImmute<Spaceship>
function process(s: Spaceship) { ... }
process(ship);  // ✓ works — WithImmute<Spaceship> extends Spaceship
```

**conclusion**: changing return type to `WithImmute<T>` is NOT a type break. it's additive.

**recommended fix**:
1. change return type from `T` to `WithImmute<T>`
2. export `WithImmute` type from public API
3. update vision contract section to reflect this

**how this was fixed**:
- updated vision cons section to note the issue
- updated vision questions section with resolution
- updated vision contract section to return `WithImmute<T>`

---

### fix 3 applied: updated vision contract

**before** (vision lines 62-70):
```ts
// input: same as today
deserialize<T>(...)
: T
// (return type unchanged, but instances have .clone())
```

**after**:
```ts
// input: same as today
deserialize<T>(...)
: WithImmute<T>
// (return type reflects .clone() availability)
```

**lesson**: when changing runtime behavior, also consider type signatures. TypeScript types should match runtime capabilities.

---

## conclusion

found THREE issues, all addressed:
1. false idempotency claim → fixed, clarified fresh instance behavior
2. unclear mental model → fixed, clarified "fully-featured"
3. TypeScript types mismatch → analyzed, found solution (return `WithImmute<T>`)

all assumptions verified. vision updated with findings.
