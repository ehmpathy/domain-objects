import {
  MARK_AS_DOMAIN_ENTITY,
  MARK_AS_DOMAIN_EVENT,
  MARK_AS_DOMAIN_LITERAL,
} from '@src/instantiation/markers';

import type { DomainObjectKind } from './DomainObjectPragma';

/**
 * .what = the class-side shape `getKind` reads: the optional domain-object marker symbols
 * .why =
 *   - lets `getKind` read markers via typed bracket access (each key is `string | undefined`)
 *     instead of `Reflect.get` (which returns `any`) — restores shapefit without an `as` cast
 *   - mirrors `DomainObjectConstructor`, which already declares `[MARK_AS_DOMAIN_OBJECT]?: string`
 * .note =
 *   - the marker keys are optional because a plain `DomainObject` carries none of the subclass markers
 *   - `name` is required so the type shares a property with the class types passed in — without it,
 *     a target of only-optional keys trips ts weak-type-detection (ts2559) at each call site
 */
type DomainObjectClassMarked = {
  name: string;
  [MARK_AS_DOMAIN_ENTITY]?: string;
  [MARK_AS_DOMAIN_LITERAL]?: string;
  [MARK_AS_DOMAIN_EVENT]?: string;
};

/**
 * .what = reads a domain object class's `kind` from its static marker symbols
 * .why =
 *   - the pragma stamps the true subclass so a consumer picks the right base class to rebuild
 *   - replaces the fragile `primary`-non-empty heuristic with the class's own marker truth
 * .note =
 *   - mirrors the instance-level `isOfDomainEntity` marker check, lifted to the class level
 *   - static markers inherit down the constructor prototype chain, so a direct read resolves
 *     subclasses (e.g. `class Job extends DomainEntity`) without a manual walk
 *   - the marker symbols are global (`Symbol.for`), so the read is cross-version safe
 *   - reads via typed bracket access (`dobj[MARK]` is `string | undefined`), not `Reflect.get`,
 *     so the marker read keeps its type instead of a fall to `any`
 *   - checks entity/literal/event, else falls back to `object` (a plain `DomainObject` with a
 *     schema but no subclass marker)
 */
export const getKind = (dobj: DomainObjectClassMarked): DomainObjectKind => {
  // read the marker off the class's static inheritance chain (entity/literal/event)
  if (dobj[MARK_AS_DOMAIN_ENTITY]) return 'entity';
  if (dobj[MARK_AS_DOMAIN_LITERAL]) return 'literal';
  if (dobj[MARK_AS_DOMAIN_EVENT]) return 'event';

  // fall back to the plain base class: a DomainObject with a schema but no subclass marker
  return 'object';
};
