import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';

export type DomainObjectShape = Record<string, any>;

export interface DomainReferenceable<
  TShape extends DomainObjectShape,
  TPrimary extends readonly string[],
  TUnique extends readonly string[],
> extends DomainEntity<TShape>,
    DomainEvent<TShape> {
  new (props: TShape): TShape;
  primary: TPrimary;
  unique: TUnique;
}

export {
  // expose an alias for easier grokability
  DomainReferenceable as Refable,
};
