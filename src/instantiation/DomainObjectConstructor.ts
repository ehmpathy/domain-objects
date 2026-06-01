import type { DomainObjectShape } from './DomainObjectShape';
import { MARK_AS_DOMAIN_OBJECT } from './markers';

/**
 * .what = constructor type for domain objects without import cycle
 * .why = enables hydration logic without direct DomainObject import
 */
export interface DomainObjectConstructor {
  new (props: DomainObjectShape): DomainObjectShape;
  build: (props: DomainObjectShape) => DomainObjectShape;
  name: string;
  prototype: DomainObjectShape;
  [MARK_AS_DOMAIN_OBJECT]?: string;
}
