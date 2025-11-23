import { v4 as uuid } from 'uuid';

import { DomainObjectNotSafeToManipulateError } from '../constraints/assertDomainObjectIsSafeToManipulate';
import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { DomainEntityUniqueKeysMustBeDefinedError } from './DomainEntityUniqueKeysMustBeDefinedError';
import { getUniqueIdentifier } from './getUniqueIdentifier';

describe('getUniqueIdentifier', () => {
  describe('literal', () => {
    it('should be able to get unique identifier accurately', () => {
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
      const unique = getUniqueIdentifier(address);
      expect(unique).toEqual({
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
    });
    it('should exclude uuid and id, if present, and custom metadata keys are not specified', () => {
      interface Address {
        id?: number;
        uuid?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}
      const address = new Address({
        id: 821,
        uuid: '__UUID__',
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
      const unique = getUniqueIdentifier(address);
      expect(unique).toEqual({
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
    });
    it('should exclude uuid and createdAt, if present, and custom metadata keys are specified', () => {
      interface Address {
        uuid?: string;
        createdAt?: string;
        street: string;
        suite?: string;
        city: string;
        state: string;
        postal: string;
      }
      class Address extends DomainLiteral<Address> implements Address {
        public static metadata = ['uuid', 'createdAt'];
      }
      const address = new Address({
        uuid: '__UUID__',
        createdAt: '__NOW__',
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
      const unique = getUniqueIdentifier(address);
      expect(unique).toEqual({
        street: '123 Elm Street',
        city: 'Austin',
        state: 'TX',
        postal: '78704',
      });
    });

    describe('nested domain objects', () => {
      it('should recursively extract unique identifiers from nested domain objects', () => {
        interface Coordinates {
          latitude: number;
          longitude: number;
        }
        class Coordinates
          extends DomainLiteral<Coordinates>
          implements Coordinates {}

        interface Location {
          coordinates: Coordinates;
          elevation: number;
        }
        class Location extends DomainLiteral<Location> implements Location {}

        const coordinates = new Coordinates({
          latitude: 37.7749,
          longitude: -122.4194,
        });

        const location = new Location({
          coordinates,
          elevation: 52,
        });

        const uniqueIdentifier = getUniqueIdentifier(location);

        // should recursively extract nested literal unique identifiers
        expect(uniqueIdentifier).toEqual({
          coordinates: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          elevation: 52,
        });
      });

      it('should handle deeply nested domain objects', () => {
        interface Temperature {
          celsius: number;
          unit: 'C';
        }
        class Temperature
          extends DomainLiteral<Temperature>
          implements Temperature {}

        interface WeatherConditions {
          temperature: Temperature;
          humidity: number;
          pressure: number;
        }
        class WeatherConditions
          extends DomainLiteral<WeatherConditions>
          implements WeatherConditions {}

        interface Observation {
          conditions: WeatherConditions;
          windSpeed: number;
          visibility: number;
        }
        class Observation
          extends DomainLiteral<Observation>
          implements Observation {}

        const temperature = new Temperature({
          celsius: 22,
          unit: 'C',
        });

        const conditions = new WeatherConditions({
          temperature,
          humidity: 65,
          pressure: 1013,
        });

        const observation = new Observation({
          conditions,
          windSpeed: 15,
          visibility: 10,
        });

        const uniqueIdentifier = getUniqueIdentifier(observation);

        // should recursively extract all nested references
        expect(uniqueIdentifier).toEqual({
          conditions: {
            temperature: {
              celsius: 22,
              unit: 'C',
            },
            humidity: 65,
            pressure: 1013,
          },
          windSpeed: 15,
          visibility: 10,
        });
      });
    });
  });
  describe('entity', () => {
    it('should be able to get unique identifier accurately', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
        public static unique = ['serialNumber'];
        public static updatable = ['fuelQuantity', 'passengers'];
      }
      const ship = new RocketShip({
        serialNumber: 'SN5',
        fuelQuantity: 9001,
        passengers: 21,
      });
      const uniqueIdentifier = getUniqueIdentifier(ship);
      expect(uniqueIdentifier).toEqual({ serialNumber: 'SN5' });
    });
    it('should throw an error if .unique is not defined on the entity', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainEntity<RocketShip> implements RocketShip {}
      const ship = new RocketShip({
        serialNumber: 'SN5',
        fuelQuantity: 9001,
        passengers: 21,
      });
      try {
        getUniqueIdentifier(ship);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          '`RocketShip.unique` must be defined, to be able to `getUniqueIdentifier`',
        );
        expect(error).toBeInstanceOf(DomainEntityUniqueKeysMustBeDefinedError);
      }
    });
    it('should be able to get unique identifier accurately', () => {
      interface SmartPhone {
        uuid: string;
        manufacturer: string;
        brand: string;
        model: string;
        os: string;
        carrier: string;
      }
      class SmartPhone extends DomainEntity<SmartPhone> implements SmartPhone {
        public static unique = ['manufacturer', 'brand', 'model'];
        public static updatable = ['os', 'carrier'];
      }
      const phone = new SmartPhone({
        uuid: '__UUID__',
        manufacturer: 'Google',
        brand: 'Pixel',
        model: 'Pixel 3a',
        os: 'Android',
        carrier: 'Verizon',
      });
      const uniqueIdentifier = getUniqueIdentifier(phone);
      expect(uniqueIdentifier).toEqual({
        manufacturer: 'Google',
        brand: 'Pixel',
        model: 'Pixel 3a',
      });
    });
    // todo: restore this functionality when we decide how to specify it better
    // it('should be able to get unique identifier accurately when it has more than one set of properties it is unique on', () => {
    //   interface RocketShip {
    //     serialNumber: string;
    //     federation: string;
    //     federationShipId: string; // e.g., the id of this ship inside of a third party system
    //     fuelQuantity: number;
    //     passengers: number;
    //   }
    //   class RocketShip extends DomainEntity<RocketShip> implements RocketShip {
    //     public static unique = [
    //       ['serialNumber'],
    //       ['federation', 'federationShipId'],
    //     ];
    //     public static updatable = ['fuelQuantity', 'passengers'];
    //   }
    //   const ship = new RocketShip({
    //     serialNumber: 'SN5',
    //     federation: 'Sol',
    //     federationShipId: 'earth:spacex:5',
    //     fuelQuantity: 9001,
    //     passengers: 21,
    //   });
    //   const uniqueIdentifier = getUniqueIdentifier(ship);
    //   expect(uniqueIdentifier).toEqual({
    //     serialNumber: 'SN5',
    //     federation: 'Sol',
    //     federationShipId: 'earth:spacex:5',
    //   }); // properties from all unique key sets should be included
    // });
    describe('nested domain objects', () => {
      it('should recursively extract unique identifiers from nested domain objects', () => {
        interface SeaTurtle {
          uuid?: string;
          seawaterSecurityNumber: string;
          name: string;
        }
        class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
          public static primary = ['uuid'] as const;
          public static unique = ['seawaterSecurityNumber'] as const;
          public static updatable = ['name'] as const;
        }

        interface SeaTurtleShell {
          turtle: SeaTurtle;
          algea: 'ALOT' | 'ALIL';
        }
        class SeaTurtleShell
          extends DomainEntity<SeaTurtleShell>
          implements SeaTurtleShell
        {
          public static unique = ['turtle'] as const;
          public static updatable = ['algea'] as const;
        }

        const turtle = new SeaTurtle({
          uuid: '1',
          seawaterSecurityNumber: '821',
          name: 'Crush',
        });

        const shell = new SeaTurtleShell({
          turtle,
          algea: 'ALIL',
        });

        const uniqueIdentifier = getUniqueIdentifier(shell);

        // should extract the nested turtle reference
        expect(uniqueIdentifier).toEqual({
          turtle: { seawaterSecurityNumber: '821' },
        });
      });

      it('should handle deeply nested domain objects', () => {
        interface Ocean {
          exid: string;
          temperature: number;
        }
        class Ocean extends DomainEntity<Ocean> implements Ocean {
          public static unique = ['exid'] as const;
          public static updatable = ['temperature'] as const;
        }

        interface Reef {
          ocean: Ocean;
          slug: string;
          depth: number;
        }
        class Reef extends DomainEntity<Reef> implements Reef {
          public static unique = ['ocean', 'slug'] as const;
          public static updatable = ['depth'] as const;
        }

        interface Coral {
          reef: Reef;
          slug: string;
          polyps: number;
        }
        class Coral extends DomainEntity<Coral> implements Coral {
          public static unique = ['reef', 'slug'] as const;
          public static updatable = ['polyps'] as const;
        }

        const ocean = new Ocean({
          exid: 'pacific-ocean',
          temperature: 72,
        });

        const reef = new Reef({
          ocean,
          slug: 'great-barrier-reef',
          depth: 100,
        });

        const coral = new Coral({
          reef,
          slug: 'staghorn-coral',
          polyps: 5000,
        });

        const uniqueIdentifier = getUniqueIdentifier(coral);

        // should recursively extract all nested references
        expect(uniqueIdentifier).toEqual({
          reef: {
            ocean: { exid: 'pacific-ocean' },
            slug: 'great-barrier-reef',
          },
          slug: 'staghorn-coral',
        });
      });
    });
  });

  describe('safety', () => {
    it('should throw an error if domain object is not safe to manipulate', () => {
      interface PlaneManufacturer {
        name: string;
      }
      interface Plane {
        uuid: string;
        manufacturer: PlaneManufacturer;
        passengerLimit: number;
      }
      class Plane extends DomainEntity<Plane> implements Plane {
        public static unique = ['uuid'];
      }
      const phone = new Plane({
        uuid: uuid(),
        manufacturer: { name: 'boeing' },
        passengerLimit: 821,
      });
      try {
        getUniqueIdentifier(phone);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainObjectNotSafeToManipulateError);
      }
    });
  });
});
