import { DomainObjectShape } from '../DomainReferenceable';
import { DomainReferenceByPivotKey } from './DomainPivotKey';

export const unpivotRef = <
  TDobj extends DomainObjectShape,
  TPivotKey extends keyof TDobj,
  TPivotValue extends keyof TDobj,
>(
  ref: DomainReferenceByPivotKey<TDobj, TPivotKey, TPivotValue>,
  key: TPivotKey,
  value: TPivotValue,
): { [key in TPivotKey]: TDobj[TPivotKey] } & {
  [key in TPivotValue]: TDobj[TPivotValue];
} => {
  return {
    [key]: Object.keys(ref)[0]! as TDobj[TPivotKey],
    [value]: Object.values(ref)[0]! as TDobj[TPivotValue],
  } as { [key in TPivotKey]: TDobj[TPivotKey] } & {
    [key in TPivotValue]: TDobj[TPivotValue];
  };
};
