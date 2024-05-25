import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainEvent } from '../instantiation/DomainEvent';
import { DomainLiteral } from '../instantiation/DomainLiteral';

/**
 * a generic which extracts the primary key of a domain object
 */
export type DomainKeyPrimary<TDobj extends typeof DomainEntity<any> | typeof DomainEvent<any> | typeof DomainLiteral<any>> =
   TDobj['primary'];
