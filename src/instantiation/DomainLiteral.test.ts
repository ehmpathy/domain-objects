import { DomainLiteral } from './DomainLiteral';

describe('DomainLiteral', () => {
  it('should be able to represent a literal', () => {
    interface Address {
      street: string;
      suite?: string;
      city: string;
      state: string;
      postal: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}
    const address = new Address({
      street: '123 Elm Street',
      city: 'Austin',
      state: 'TX',
      postal: '78704',
    });
    expect(address.city).toEqual('Austin'); // sanity check
  });
  it('should be spreadable', () => {
    interface Address {
      street: string;
      suite?: string;
      city: string;
      state: string;
      postal: string;
    }
    class Address extends DomainLiteral<Address> implements Address {}
    const address = new Address({
      street: '123 Elm Street',
      city: 'Austin',
      state: 'TX',
      postal: '78704',
    });
    const differentAddress = new Address({
      ...address,
      street: '456 Bluebonnet Ave',
    });
    expect(differentAddress.city).toEqual('Austin'); // sanity check
    expect(differentAddress.street).toEqual('456 Bluebonnet Ave'); // sanity check
  });
});
