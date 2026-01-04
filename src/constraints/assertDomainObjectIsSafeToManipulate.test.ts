import { getUuid as uuid } from 'uuid-fns';

import { DomainObject } from '@src/instantiation/DomainObject';

import { assertDomainObjectIsSafeToManipulate } from './assertDomainObjectIsSafeToManipulate';

describe('assertDomainObjectIsSafeToManipulate', () => {
  it('should not throw an error if DomainObject has no nested objects', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // instantiate it
    const pot = new PlantPot({ diameterInInches: 7 });

    // check if its safe
    assertDomainObjectIsSafeToManipulate(pot); // should be safe
  });
  it('should not throw an error if DomainObject has a nested Date object', () => {
    // define the plant pot
    interface PlantPot {
      createdAt: Date;
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // instantiate it
    const pot = new PlantPot({ createdAt: new Date(), diameterInInches: 7 });

    // check if its safe
    assertDomainObjectIsSafeToManipulate(pot); // should be safe
  });
  it('should not throw an error if all nested objects on DomainObject are explicitly defined as nested', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // define the plant
    interface Plant {
      pot: PlantPot;
      lastWatered: string;
    }
    class Plant extends DomainObject<Plant> implements Plant {
      public static nested = { pot: PlantPot };
    }

    // now show we still think its safe
    const plant = new Plant({
      pot: { diameterInInches: 7 },
      lastWatered: 'monday',
    });
    assertDomainObjectIsSafeToManipulate(plant);
  });
  it('should not throw an error if DomainObject has an array of strings', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
      pastPlantUuids: string[];
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // instantiate it
    const pot = new PlantPot({
      diameterInInches: 7,
      pastPlantUuids: [uuid(), uuid()],
    });

    // check if its safe
    assertDomainObjectIsSafeToManipulate(pot); // should be safe
  });
  it('should not throw an error if DomainObject has an array of DomainObjects explicitly defined as nested', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // define the plant
    interface Plant {
      pastPots: PlantPot[];
      lastWatered: string;
    }
    class Plant extends DomainObject<Plant> implements Plant {
      public static nested = { pastPots: PlantPot };
    }

    // now show we still think its safe
    const plant = new Plant({
      pastPots: [{ diameterInInches: 7 }],
      lastWatered: 'monday',
    });
    assertDomainObjectIsSafeToManipulate(plant);
  });
  it('should throw a helpful error if any of the properties are a nested object not explicitly defined', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // define the plant
    interface Plant {
      pot: PlantPot;
      lastWatered: string;
    }
    class Plant extends DomainObject<Plant> implements Plant {}

    // now show we do not think its safe
    const plant = new Plant({
      pot: { diameterInInches: 7 },
      lastWatered: 'monday',
    });
    try {
      assertDomainObjectIsSafeToManipulate(plant);
      throw new Error('should not reach here');
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      expect(error.message).toContain(
        `DomainObject 'Plant' is not safe to manipulate.`,
      );
      expect(error.message).toContain(`["pot"]`); // should identify the culprits
      expect(error.message).toContain(
        `Please make sure all nested objects are DomainObjects and are explicitly defined on the class definition, using the 'nested' static property.`,
      ); // should explain how to fix
      expect(error.message).toContain('For example'); // should include an example
      expect(error.message).toMatchSnapshot(); // should look nice - visually
    }
  });
  it('should throw a helpful error if any of the properties are an array with nested objects not explicitly defined', () => {
    // define the plant pot
    interface PlantPot {
      diameterInInches: number;
    }
    class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

    // define the plant
    interface Plant {
      pastPots: PlantPot[];
      lastWatered: string;
    }
    class Plant extends DomainObject<Plant> implements Plant {}

    // now show we do not think its safe
    const plant = new Plant({
      pastPots: [{ diameterInInches: 7 }],
      lastWatered: 'monday',
    });
    try {
      assertDomainObjectIsSafeToManipulate(plant);
      throw new Error('should not reach here');
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      expect(error.message).toContain(
        `DomainObject 'Plant' is not safe to manipulate.`,
      );
      expect(error.message).toContain(`["pastPots"]`); // should identify the culprits
      expect(error.message).toContain(
        `Please make sure all nested objects are DomainObjects and are explicitly defined on the class definition, using the 'nested' static property.`,
      ); // should explain how to fix
      expect(error.message).toContain('For example'); // should include an example
      expect(error.message).toMatchSnapshot(); // should look nice - visually
    }
  });

  describe('onKeys option', () => {
    it('should only validate specified keys when onKeys is provided', () => {
      // define a domain entity with unique keys
      interface User {
        uuid: string;
        email: string;
        metadata: { preferences: any }; // this is NOT defined as nested, but is NOT a unique key
      }
      class User extends DomainObject<User> implements User {
        public static unique = ['email'];
      }

      // instantiate with metadata that would normally fail validation
      const user = new User({
        uuid: uuid(),
        email: 'test@example.com',
        metadata: { preferences: { theme: 'dark' } }, // not defined as nested, but not in unique keys
      });

      // should NOT throw when only checking email (because metadata is not checked)
      expect(() =>
        assertDomainObjectIsSafeToManipulate(user, { onKeys: ['email'] }),
      ).not.toThrow();

      // should throw when checking all keys (default)
      expect(() => assertDomainObjectIsSafeToManipulate(user)).toThrow();
    });

    it('should still validate nested objects in specified keys', () => {
      // define nested object
      interface Department {
        name: string;
      }

      // define a domain entity with nested object in unique keys
      interface User {
        department: Department; // this IS a unique key but NOT defined as nested
        email: string;
      }
      class User extends DomainObject<User> implements User {
        public static unique = ['department'];
      }

      // instantiate with department that's not properly nested
      const user = new User({
        department: { name: 'Engineering' }, // not defined as nested, and IS in unique keys
        email: 'test@example.com',
      });

      // should throw when checking department (because department IS specified and not safe)
      expect(() =>
        assertDomainObjectIsSafeToManipulate(user, {
          onKeys: ['department'],
        }),
      ).toThrow();
    });
  });
});
