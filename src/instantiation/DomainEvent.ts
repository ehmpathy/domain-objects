import { DomainObject } from './DomainObject';
import { VERSION } from './version';

// marker symbol (cross-version, global registry)
export const MARK_AS_DOMAIN_EVENT = Symbol.for('domain-objects/DomainEvent');

/**
 * In Domain Driven Design, an Event is a type of Domain Object for which:
 * - properties are immutable (e.g., something happened)
 * - identity does matter
 *   - i.e., it is uniquely identified by what happened and to what
 *   - i.e., if you change the uniquely identifying properties (when or to what) of an event, it will be considered a new event
 *   - i.e., not all properties on the event uniquely identify the event
 *
 * The purpose of a Domain Event is to represent interesting things that happen in the domain.
 *
 * For example,
 * - An `ItemViewedEvent { itemUuid, customerUuid, occurredAt }` is an event. Changing when it `occurredAt` which `customerUuid` did it or which `itemUuid` it happened to would result in a new event.
 * - A `PowerSupplyMeasuredEvent { batteryUuid, current, voltage, temperature, occurredAt }` is an event. Changing when it `occurredAt` or which `batteryUuid` it occurred to would result in a new event. Note: changing the `current`, `voltage`, or `temperature` would _not_ result in a new event though, since only one measurement can be made at a time for a `batteryUuid`
 */
export abstract class DomainEvent<
  T extends Record<string, any>,
> extends DomainObject<T> {
  /**
   * DomainEvent marker symbol for cross-version compatibility.
   *
   * Uses Symbol.for() to create a global symbol that works across different versions
   * of the domain-objects library. The value is the version string.
   */
  public static readonly [MARK_AS_DOMAIN_EVENT] = VERSION;

  /**
   * `DomainEvent.primary` defines the surrogate key of the domain.event, utilized as the primary key in persistance
   *
   * for example,
   * - a `FileProcessingJob { uuid, filePath, status }` is likely going to have a primary key of `uuid`
   * - a `GoogleAdsCampaign { resourceName, accountId, name }`, however, has a primary key of `resourceName`
   *
   * ref
   * - https://en.wikipedia.org/wiki/Surrogate_key
   */
  public static primary?: readonly [string]; // todo: ensure that its a keyof T; https://github.com/microsoft/TypeScript/issues/32211

  /**
   * `DomainEvent.unique` defines the natural key of the domain.event, utilized as the unique key in persistance
   *
   * note,
   * - for domain.events, it should always include a timestamp.
   *
   * for example,
   * - a `FileOpenedEvent { fileUuid, userUuid, occurredAt }` is likely going to be unique on the all of the keys: the combination of `['fileUuid', 'userUuid', 'occurredAt']` uniquely identifies the event.
   * - an `AirComfortMeasuredEvent { locationUuid, sensorUuid, temperature, humidity, occurredAt }`, on the other hand, is likely only going to be unique on `['locationUuid', 'sensorUuid', 'occurredAt']`, because logically we cant have a measurement from the same `sensor` + `location` at the same `time`
   *
   * ref
   * - https://en.wikipedia.org/wiki/Natural_key
   */
  public static unique: readonly string[]; // todo: ensure that its a keyof T; https://github.com/microsoft/TypeScript/issues/32211
}
