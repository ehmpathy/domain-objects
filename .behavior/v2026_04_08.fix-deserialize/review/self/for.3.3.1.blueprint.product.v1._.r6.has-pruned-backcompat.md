# self-review r6: has-pruned-backcompat

## backwards compatibility concerns in blueprint

### concern 1: return type change from T to WithImmute<T>

**what the blueprint does**: changes `deserialize<T>(): T` to `deserialize<T>(): WithImmute<T>`

**is backwards compat explicitly addressed?** yes — vision Q3:
> "change return type to `WithImmute<T>` and export `WithImmute` type. this is NOT a type break because `WithImmute<T>` extends `T`."

**wisher confirmation**: vision Q5 asks "do users need to change their code?" and answers "no. backwards compatible at runtime and type level."

**why it holds — structural type compatibility**:

TypeScript uses structural types. `WithImmute<T>` is defined as:
```ts
type WithImmute<T> = T & { clone(updates?: Partial<T>): WithImmute<T> }
```

this means:
- `WithImmute<T>` contains ALL properties of `T`
- plus ONE additional property (`.clone`)
- so `WithImmute<T>` is assignable to `T` everywhere

example:
```ts
// before: code expects T
const result: MyDomain = deserialize<MyDomain>(str);
// after: WithImmute<MyDomain> is returned
// but WithImmute<MyDomain> has all properties of MyDomain
// so assignment succeeds — no type error
```

**verdict**: backwards compat was explicitly confirmed by wisher AND holds due to TypeScript structural types.

---

### concern 2: no new options required

**what the blueprint does**: makes withImmute application automatic, no opt-in flag

**is backwards compat explicitly addressed?** yes — vision explicitly states:
> "no new api. no new options. it just works."

**wisher confirmation**: vision Q1 asks "should this be opt-in via a new option?" and answers "no, always apply (wish says 'no reason not to')"

**why it holds — no extant opt-out expectation**:

the wish explicitly says "always add withImmute, no reason not to". this means:
1. wisher evaluated whether opt-out was needed
2. wisher concluded it was not
3. automatic application is the desired behavior

if we added an option anyway, we would be:
- contradicting the explicit wish
- complicating the API unnecessarily
- creating an opt-in where none was requested

**verdict**: not an assumed concern — wisher explicitly confirmed no options needed, and we correctly did not add any.

---

### concern 3: behavior change for deserialized objects

**what the blueprint does**: deserialized domain objects now have `.clone()` method they didn't have before

**is this a break?**
- adding a property never breaks code that doesn't use it
- the property is non-enumerable (doesn't affect `Object.keys()`, JSON stringify, etc.)
- no one should depend on absence of `.clone()`

**wisher confirmation**: vision assumptions section:
> "no one depends on absence of .clone() — can't imagine why they would"

**why it holds — non-enumerable addition is invisible**:

the `.clone` property is added via:
```ts
Object.defineProperty(obj, 'clone', {
  enumerable: false,  // <-- key
  configurable: false,
  writable: false,
  value: ...
});
```

this means:
1. `Object.keys(obj)` does NOT include 'clone'
2. `JSON.stringify(obj)` does NOT include clone
3. `for...in` loops do NOT iterate over clone
4. spread `{...obj}` does NOT copy clone

the only way to access it is `obj.clone()` — explicit method call.

**what would break?**
- code that checks `'clone' in obj` expecting false → extremely unlikely pattern
- code that hasOwnProperty checks for 'clone' → also unlikely
- code that explicitly accesses obj.clone expecting undefined → absurd pattern

**verdict**: `.clone()` addition is invisible to all normal operations. no backwards compat concern.

---

## did we add "just to be safe" compat?

**checked blueprint for**:
- feature flags → none added
- opt-in/opt-out options → none added
- deprecation alerts → none added
- legacy codepaths → none added
- fallback behaviors → none added

**result**: no "just to be safe" compat was added

---

## open questions to flag?

**question**: should users be warned about the new `.clone()` property?

**answer from vision**: no alert needed — it's additive and non-break

**question**: should we version-bump this as major?

**answer from vision Q4**: "minor, additive change (no removal, no break)"

---

## conclusion

all backwards compatibility was explicitly addressed by the wisher in the vision:

| concern | wisher said | why it holds |
|---------|-------------|--------------|
| type change | "NOT a type break" | `WithImmute<T>` contains all of `T`, TypeScript structural types allow assignment |
| no options | "no new api, no new options" | wish says "no reason not to", opt-out would contradict |
| .clone() added | "no one depends on absence" | non-enumerable property is invisible to all normal operations |

no "just to be safe" compat was added:
- no feature flags
- no opt-in/opt-out
- no deprecation paths
- no legacy codepaths
- no fallbacks

**status**: no unprescribed backcompat to prune. all concerns trace to explicit wisher decisions.
