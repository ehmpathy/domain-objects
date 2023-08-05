import { DomainObject } from './DomainObject';

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
   * `DomainEvent.unique` defines all of the properties of the event that the event is naturally unique on.
   *
   * It should always include a timestamp.
   *
   * For example,
   * - a `FileOpenedEvent { fileUuid, userUuid, occurredAt }` is likely going to be unique on the all of the keys: the combination of `['fileUuid', 'userUuid', 'occurredAt']` uniquely identifies the event.
   * - an `AirComfortMeasuredEvent { locationUuid, sensorUuid, temperature, humidity, occurredAt }`, on the other hand, is likely only going to be unique on `['locationUuid', 'sensorUuid', 'occurredAt']`, because logically we cant have a measurement from the same `sensor` + `location` at the same `time`
   */
  public static unique: readonly string[];
}
