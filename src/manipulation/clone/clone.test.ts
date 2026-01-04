import { given, then } from 'test-fns';

import { DomainObject } from '@src/instantiation/DomainObject';

import { clone } from './clone';

describe('clone', () => {
  describe('deepMerge', () => {
    given('top-level primitives', () => {
      const input = { name: 'rocket', fuel: 100 };

      then('should override values from updates', () => {
        const updates = { fuel: 200 };
        const result = clone(input, updates);
        expect(result).toEqual({ name: 'rocket', fuel: 200 });
      });

      then('should preserve value when update is undefined', () => {
        const updates = { fuel: undefined };
        const result = clone(input, updates);
        expect(result).toEqual({ name: 'rocket', fuel: 100 });
      });
    });

    given('nested object structures', () => {
      const input = {
        engine: { thrust: 9000, temperature: 'hot' },
        hull: 'steel',
      };

      then('should only update specified nested fields', () => {
        const updates = { engine: { temperature: 'cool' } };
        const result = clone(input, updates);
        expect(result).toEqual({
          engine: { thrust: 9000, temperature: 'cool' },
          hull: 'steel',
        });
      });

      then('should fail fast on incompatible update shape', () => {
        const badUpdates = { config: 'off' };
        // @ts-expect-error: config should be an object
        const result = clone({ config: { enabled: true } }, badUpdates);
        expect(result).toEqual({ config: 'off' });
      });
    });

    given('objects with arrays', () => {
      then('should replace arrays at the top level', () => {
        const input = { tags: ['exploration', 'science'] };
        const updates = { tags: ['mars'] };
        const result = clone(input, updates);
        expect(result).toEqual({ tags: ['mars'] });
      });

      then('should update nested arrays correctly', () => {
        const input = { cargo: { items: ['food'] } };
        const updates = { cargo: { items: ['tools'] } };
        const result = clone(input, updates);
        expect(result).toEqual({ cargo: { items: ['tools'] } });
      });
    });

    given('empty updates', () => {
      const input = { fuel: 100, active: true };

      then('should return a deep clone of the original', () => {
        const result = clone(input, {});
        expect(result).toEqual(input);
        expect(result).not.toBe(input); // ensure new reference
      });
    });

    given('dobj instances', () => {
      // define the plant pot
      interface PlantPot {
        diameterInInches: number;
      }
      class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

      // define the plant bed
      interface PlantBed {
        location: string;
      }
      class PlantBed extends DomainObject<PlantBed> implements PlantBed {}

      // define the plant
      interface Plant {
        plantedIn: PlantPot | PlantBed;
        lastWatered: string;
      }
      class Plant extends DomainObject<Plant> implements Plant {
        public static nested = { plantedIn: [PlantPot, PlantBed] };
      }

      given('a dobj instance with no nesting', () => {
        const original = new PlantPot({ diameterInInches: 7 });

        then('clone should preserve the prototype and apply updates', () => {
          const result = clone(original, { diameterInInches: 9 });
          expect(result).toBeInstanceOf(PlantPot);
          expect(result.diameterInInches).toBe(9);
        });

        then(
          'clone should preserve the original values when not updated',
          () => {
            const result = clone(original, {});
            expect(result).not.toBe(original);
            expect(result.diameterInInches).toBe(7);
          },
        );

        then(
          'clone should preserve the original constructor and remain an instance of the same class',
          () => {
            const result = clone(original, {});
            expect(result.constructor.name).toBe('PlantPot');
            expect(result).toBeInstanceOf(PlantPot);
            expect(result instanceof PlantPot).toBe(true);
          },
        );
      });

      given('a dobj instance with nested domain object', () => {
        const plant = new Plant({
          plantedIn: { _dobj: 'PlantPot', diameterInInches: 7 } as PlantPot,
          lastWatered: 'monday',
        });

        then('nested field should hydrate to correct dobj type', () => {
          expect(plant.plantedIn).toBeInstanceOf(PlantPot);
        });

        then('clone should preserve the nested dobj type', () => {
          const result = clone(plant, { lastWatered: 'tuesday' });
          expect(result).toBeInstanceOf(Plant);
          expect(result.lastWatered).toBe('tuesday');
          expect(result.plantedIn).toBeInstanceOf(PlantPot);
        });

        then('clone should not affect the original dobj instance', () => {
          const result = clone(plant, { lastWatered: 'friday' });
          expect(plant.lastWatered).toBe('monday');
          expect(result.lastWatered).toBe('friday');
        });

        then(
          'clone should preserve constructor.name and instanceof for both root and nested objects',
          () => {
            const result = clone(plant, {});
            expect(result.constructor.name).toBe('Plant');
            expect(result instanceof Plant).toBe(true);
            expect(result.plantedIn.constructor.name).toBe('PlantPot');
            expect(result.plantedIn instanceof PlantPot).toBe(true);
          },
        );
      });
    });
  });

  describe('deepClone', () => {
    given('a plain object with primitives', () => {
      const original = { name: 'Apollo', fuel: 100 };
      const result = clone(original);

      then('clone should not affect original if mutated', () => {
        result.fuel = 999;
        expect(original.fuel).toBe(100);
      });
    });

    given('a nested object', () => {
      const original = {
        engine: { type: 'ion', thrust: 5000 },
        status: { active: true },
      };
      const result = clone(original);

      then('mutation on clone should not leak to original', () => {
        result.engine.thrust = 8000;
        result.status.active = false;

        expect(original.engine.thrust).toBe(5000);
        expect(original.status.active).toBe(true);
      });
    });

    given('an object with arrays', () => {
      const original = {
        crew: ['Alice', 'Bob'],
        cargo: [{ item: 'food', qty: 10 }],
      };
      const result = clone(original);

      then('mutation on array should not affect original', () => {
        result.crew.push('Charlie');
        result.cargo[0]!.qty = 999;

        expect(original.crew).toEqual(['Alice', 'Bob']);
        expect(original.cargo[0]!.qty).toBe(10);
      });
    });

    given('dobj instances', () => {
      // define the plant pot
      interface PlantPot {
        diameterInInches: number;
      }
      class PlantPot extends DomainObject<PlantPot> implements PlantPot {}

      // define the plant bed
      interface PlantBed {
        location: string;
      }
      class PlantBed extends DomainObject<PlantBed> implements PlantBed {}

      // define the plant
      interface Plant {
        plantedIn: PlantPot | PlantBed;
        lastWatered: string;
      }
      class Plant extends DomainObject<Plant> implements Plant {
        public static nested = { plantedIn: [PlantPot, PlantBed] };
      }

      const plant = new Plant({
        plantedIn: new PlantPot({ diameterInInches: 7 }),
        lastWatered: 'monday',
      });

      const cloned = clone(plant);

      then('should preserve prototype of root instance', () => {
        expect(cloned).toBeInstanceOf(Plant);
      });

      then('should preserve prototype of nested dobj instance', () => {
        expect(cloned.plantedIn).toBeInstanceOf(PlantPot);
      });

      then('mutating the clone should not affect original', () => {
        (cloned.plantedIn as PlantPot).diameterInInches = 42;
        cloned.lastWatered = 'friday';

        expect((plant.plantedIn as PlantPot).diameterInInches).toBe(7);
        expect(plant.lastWatered).toBe('monday');
      });

      then('original and clone should not share references', () => {
        expect(cloned).not.toBe(plant);
        expect(cloned.plantedIn).not.toBe(plant.plantedIn);
      });

      then(
        'clone should preserve constructor.name and instanceof for both root and nested objects',
        () => {
          expect(cloned.constructor.name).toBe('Plant');
          expect(cloned instanceof Plant).toBe(true);
          expect(cloned.plantedIn.constructor.name).toBe('PlantPot');
          expect(cloned.plantedIn instanceof PlantPot).toBe(true);
        },
      );
    });

    given('plain objects without constructors', () => {
      const plainObj = { name: 'test', value: 123 };

      then('clone should return a plain object with Object constructor', () => {
        const result = clone(plainObj as any);
        expect(result.constructor.name).toBe('Object');
        expect(result instanceof Object).toBe(true);
        expect(result).toEqual(plainObj);
      });
    });
  });
});
