import type { DomainEntity } from '@src/instantiation/DomainEntity';
import type { DomainEvent } from '@src/instantiation/DomainEvent';
import type { DomainObjectShape } from '@src/instantiation/DomainObjectShape';

export type { DomainObjectShape } from '@src/instantiation/DomainObjectShape';

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
