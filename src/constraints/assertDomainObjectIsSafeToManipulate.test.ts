import { v4 as uuid } from 'uuid';

import { DomainObject } from '../instantiation/DomainObject';
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
});
