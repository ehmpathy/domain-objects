import { type DomainEntity } from '../instantiation/DomainEntity';
import { type DomainEvent } from '../instantiation/DomainEvent';

export type DomainObjectShape = Record<string, any>;

export interface Refable<
  TShape extends DomainObjectShape,
  TPrimary extends readonly string[],
  TUnique extends readonly string[],
> extends DomainEntity<TShape>,
    DomainEvent<TShape> {
  new (props: TShape): TShape;
  primary: TPrimary;
  unique: TUnique;
}
