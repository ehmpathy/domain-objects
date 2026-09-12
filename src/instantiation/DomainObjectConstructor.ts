import type { DomainObjectInstantiationOptions } from './DomainObjectInstantiationOptions';
import type { DomainObjectShape } from './DomainObjectShape';
import { MARK_AS_DOMAIN_OBJECT } from './markers';
import type { SchemaOptions } from './validate/validate';

/**
 * .what = constructor type for domain objects without import cycle
 * .why = enables hydration logic without direct DomainObject import
 * .note = `new` and `build` each declare the `options` parameter that `DomainObject` really takes,
 *   so a reader that must skip an instantiation step (`{ skip: { schema: true } }`) reaches it
 *   through this type rather than re-declares the signature structurally. the parameter is
 *   optional, so every extant caller that supplies props alone stays assignable.
 */
export interface DomainObjectConstructor {
  new (
    props: DomainObjectShape,
    options?: DomainObjectInstantiationOptions,
  ): DomainObjectShape;
  build: (
    props: DomainObjectShape,
    options?: DomainObjectInstantiationOptions,
  ) => DomainObjectShape;
  name: string;
  prototype: DomainObjectShape;
  schema?: SchemaOptions<any>;
  [MARK_AS_DOMAIN_OBJECT]?: string;
}
