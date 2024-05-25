import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';

/**
 * a generic which extracts the unique keys of a domain object
 *
 * note
 * - domain.literals are unique on their full identity and so have no unique key, only their full definition
 */
export type DomainKeyUnique<TDobj extends typeof DomainEntity<any> | typeof DomainEvent<any>> =
  TDobj['unique'];
