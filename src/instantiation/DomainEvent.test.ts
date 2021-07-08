import { DomainEvent } from './DomainEvent';

describe('DomainEvent', () => {
  it('should be able to represent an event', () => {
    interface OrderPlacedEvent {
      orderUuid: string;
      customerUuid: string;
      occurredAt: string;
    }
    class OrderPlacedEvent extends DomainEvent<OrderPlacedEvent> implements OrderPlacedEvent {}
    const event = new OrderPlacedEvent({ orderUuid: '__ORDER_UUID__', customerUuid: '__CUSTOMER_UUID__', occurredAt: '__TIMESTAMP__' });
    expect(event.orderUuid).toEqual('__ORDER_UUID__'); // sanity check
  });
  it('should be spreadable', () => {
    interface OrderPlacedEvent {
      orderUuid: string;
      customerUuid: string;
      occurredAt: string;
    }
    class OrderPlacedEvent extends DomainEvent<OrderPlacedEvent> implements OrderPlacedEvent {}
    const event = new OrderPlacedEvent({ orderUuid: '__ORDER_UUID__', customerUuid: '__CUSTOMER_UUID__', occurredAt: '__TIMESTAMP__' });
    const differentEvent = new OrderPlacedEvent({ ...event, orderUuid: '__DIFFERENT_ORDER_UUID__' });
    expect(differentEvent.orderUuid).toEqual('__DIFFERENT_ORDER_UUID__'); // sanity check
    expect(differentEvent.customerUuid).toEqual('__CUSTOMER_UUID__'); // sanity check
  });
});
