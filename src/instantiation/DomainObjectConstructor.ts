import type { DomainObjectShape } from './DomainObjectShape';
import { MARK_AS_DOMAIN_OBJECT } from './markers';
import type { SchemaOptions } from './validate/validate';

/**
 * .what = constructor type for domain objects without import cycle
 * .why = enables hydration logic without direct DomainObject import
 */
export interface DomainObjectConstructor {
  new (props: DomainObjectShape): DomainObjectShape;
  build: (props: DomainObjectShape) => DomainObjectShape;
  name: string;
  prototype: DomainObjectShape;
  schema?: SchemaOptions<any>;
  [MARK_AS_DOMAIN_OBJECT]?: string;
}
