# review.self: has-role-standards-adherance (r10)

## the question

> does the implementation follow mechanic role standards?

## standards check

| standard | status | evidence |
|----------|--------|----------|
| no gerunds | pass | code reviewed, no -ing nouns |
| no forbidden terms | pass | no blocklisted terms in code |
| lowercase preference | pass | code follows lowercase convention |
| input-context pattern | pass | applyWithImmuteToTree uses proper arg pattern |
| arrow functions only | pass | all functions use arrow syntax |
| what-why headers | pass | jsdoc comments in place |
| single responsibility | pass | one operation function, one purpose |

## code review

### deserialize.ts changes

```ts
/**
 * .what = recursively apply withImmute to all domain objects in tree
 * .why = ensures all nested domain objects have .clone() method
 */
const applyWithImmuteToTree = <T>(value: T): T => { ... }
```

- arrow function: yes
- what-why header: yes
- single responsibility: yes (one purpose)

### test file changes

- uses describe/it pattern (pre-extant convention)
- explicit assertions (not snapshots)
- covers positive and negative cases

## issues found

none.

## why it holds

1. code follows mechanic role standards
2. no forbidden terms or gerunds
3. proper function signatures and headers
4. test conventions match pre-extant patterns
5. implementation is minimal and focused

