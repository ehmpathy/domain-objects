/**
 * .what = the kind of a domain object — which base class it extends
 * .why =
 *   - the pragma stamps the true subclass so a consumer can pick the right base class to rebuild
 *   - replaces the fragile `primary`-non-empty heuristic (a literal may declare `primary`; an
 *     entity may omit it) with the class's own marker-symbol truth
 * .note = `object` is the fallback for a plain `DomainObject` with a schema but no subclass marker
 */
export type DomainObjectKind = 'entity' | 'literal' | 'event' | 'object';

/**
 * .what = the type of a domain object's `x-domain-object` **pragma** — the static declarations
 *   stamped onto its `.contract` schema so a cross-service consumer can reconstruct the class.
 *
 * .why =
 *   a domain object splits into two halves on the wire:
 *   - **instance** data (a Job's `uuid`, `status` values) → already carried by the schema/contract
 *   - **static** declarations (the Job class's `primary`, `unique`, `kind`) → the schema cannot
 *     carry class statics, so the pragma exists to carry them
 *   the *only* reason to read this type is to **rebuild the class** (codegen turns it back into
 *   `class Job extends DomainEntity { static primary = [...] }`). a consumer who does not care
 *   about the class does not need these fields.
 *
 * .note = the term **pragma**, from Greek `prâgma` ("a deed, a matter of fact"; cf. C's `#pragma`):
 *   a stated fact stamped alongside a payload that declares how to interpret it. the domain-object
 *   pragma family states a schema node's domain-object semantics:
 *
 *   | pragma (json keyword) | states                    | type                                |
 *   |-----------------------|---------------------------|-------------------------------------|
 *   | `x-domain-object`     | this node **IS** dobj X   | `DomainObjectPragma` (this type)    |
 *   | `x-domain-object-ref` | this node **REFERENCES** X | `DomainObjectPragmaRef` (not yet shipped) |
 *
 *   the base + `Ref` partner mirrors the runtime pair `DomainObject : Ref`. only the base
 *   (`DomainObjectPragma`) ships today; `DomainObjectPragmaRef` is a peer-branch partner, not yet
 *   exported from this package.
 *
 * .note = fields are **optional** where the stamp omits them: `getContract` writes `primary`/
 *   `unique`/`alias`/`nested` only when the dobj declares them, so a consumer reads e.g.
 *   `pragma.primary` as `string[] | undefined`. field names mirror the class statics exactly.
 *
 * @example
 * // the `x-domain-object` node comes off an untyped json-schema blob, so the cast is a
 * // boundary read — domain-objects ships the type, the consumer owns the node access
 * const pragma = jsonSchema['x-domain-object'] as DomainObjectPragma;
 * pragma.kind;    // 'entity' | 'literal' | 'event' | 'object'
 * pragma.primary; // string[] | undefined
 */
export type DomainObjectPragma = {
  /**
   * the domain object's class name (`constructor.name`) — names the reconstructed type
   */
  name: string;

  /**
   * which base class the domain object extends — picks `DomainEntity` / `DomainLiteral` /
   * `DomainEvent` (or a plain `DomainObject`) when the consumer rebuilds the class
   */
  kind: DomainObjectKind;

  /**
   * the surrogate key (`DomainEntity.primary` / `DomainLiteral.primary`), when declared
   */
  primary?: string[];

  /**
   * the natural key (`DomainEntity.unique`), when declared
   */
  unique?: string[];

  /**
   * the colloquial alias (`DomainObject.alias`), when declared
   */
  alias?: string | { singular?: string; plural?: string };

  /**
   * the nested dobj names by key (`DomainObject.nested`), when declared — a single name, or an
   * array of names for polymorphic nested choices
   */
  nested?: Record<string, string | string[]>;
};
