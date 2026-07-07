import Joi from 'joi';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { DomainObject } from '@src/instantiation/DomainObject';

import {
  hydrateNestedDomainObjects,
  NestedDomainObjectHydrationError,
} from './hydrateNestedDomainObjects';

// define the seaturtle's forage wrapper, the single-option nested target
interface SeaturtleForage {
  include?: string;
  exclude?: string;
}
class SeaturtleForage
  extends DomainObject<SeaturtleForage>
  implements SeaturtleForage {}

// define two forage wrapper options, for the multi-option cases
interface SeaturtleForageInclude {
  include?: string;
}
class SeaturtleForageInclude
  extends DomainObject<SeaturtleForageInclude>
  implements SeaturtleForageInclude {}

interface SeaturtleForageExclude {
  exclude?: string;
}
class SeaturtleForageExclude
  extends DomainObject<SeaturtleForageExclude>
  implements SeaturtleForageExclude {}

// a species the turtle forages, keyed by slug
interface SeaturtleForageSpecies {
  slug: string;
}
class SeaturtleForageSpecies
  extends DomainObject<SeaturtleForageSpecies>
  implements SeaturtleForageSpecies
{
  public static schema = z.object({ slug: z.string() }).strict();
}

// a different domain object: include/exclude lists of species
interface SeaturtleForageScope {
  include: SeaturtleForageSpecies[];
  exclude: SeaturtleForageSpecies[];
}
class SeaturtleForageScope
  extends DomainObject<SeaturtleForageScope>
  implements SeaturtleForageScope
{
  public static schema = z
    .object({
      include: z.array(z.object({ slug: z.string() })),
      exclude: z.array(z.object({ slug: z.string() })),
    })
    .strict();
  public static nested = {
    include: SeaturtleForageSpecies,
    exclude: SeaturtleForageSpecies,
  };
}

// a turtle whose forage is one of two structurally-distinct options
interface Seaturtle {
  forage: SeaturtleForageSpecies | SeaturtleForageScope;
  name: string;
}
class Seaturtle extends DomainObject<Seaturtle> implements Seaturtle {
  public static nested = {
    forage: [SeaturtleForageSpecies, SeaturtleForageScope],
  };
}

describe('hydrateNestedDomainObjects', () => {
  given('a single-option nested key', () => {
    const nested = { forage: SeaturtleForage };

    when('the value is a bare scalar', () => {
      then('it leaves the scalar un-hydrated (field-level guard)', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: 'seagrass' },
          nested,
          domainObjectName: 'Seaturtle',
        });
        expect(hydrated.forage).toEqual('seagrass');
        expect(hydrated.forage).not.toBeInstanceOf(SeaturtleForage);
      });
    });

    when('the value is a bare array of scalars', () => {
      then('it leaves the array un-hydrated (element-level guard)', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: ['seagrass', 'jellyfish'] },
          nested,
          domainObjectName: 'Seaturtle',
        });
        expect(hydrated.forage).toEqual(['seagrass', 'jellyfish']);
        (hydrated.forage as string[]).forEach((food) =>
          expect(food).not.toBeInstanceOf(SeaturtleForage),
        );
      });
    });

    when('the value is null', () => {
      then('it leaves the field null (field-level null guard)', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: null },
          nested,
          domainObjectName: 'Seaturtle',
        });
        expect(hydrated.forage).toEqual(null);
      });
    });

    when('an array element is null', () => {
      then('it leaves the null element (element-level null guard)', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: [null] },
          nested,
          domainObjectName: 'Seaturtle',
        });
        expect(hydrated.forage).toEqual([null]);
      });
    });

    when('the value is an object', () => {
      then('it hydrates the object into the nested option', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: { include: 'seagrass' } },
          nested,
          domainObjectName: 'Seaturtle',
        });
        expect(hydrated.forage).toBeInstanceOf(SeaturtleForage);
        expect((hydrated.forage as SeaturtleForage).include).toEqual(
          'seagrass',
        );
      });
    });

    when('the value is an array of objects', () => {
      then('it hydrates each object element', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: {
            forage: [{ include: 'seagrass' }, { exclude: 'jellyfish' }],
          },
          nested,
          domainObjectName: 'Seaturtle',
        });
        const forage = hydrated.forage as SeaturtleForage[];
        expect(forage).toHaveLength(2);
        expect(forage[0]).toBeInstanceOf(SeaturtleForage);
        expect(forage[0]!.include).toEqual('seagrass');
        expect(forage[1]).toBeInstanceOf(SeaturtleForage);
        expect(forage[1]!.exclude).toEqual('jellyfish');
      });
    });

    when('the value is a mixed array of scalar and object', () => {
      then('it leaves the scalar and hydrates the object', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: ['seagrass', { include: 'jellyfish' }] },
          nested,
          domainObjectName: 'Seaturtle',
        });
        const forage = hydrated.forage as Array<string | SeaturtleForage>;
        expect(forage[0]).toEqual('seagrass');
        expect(forage[0]).not.toBeInstanceOf(SeaturtleForage);
        expect(forage[1]).toBeInstanceOf(SeaturtleForage);
        expect((forage[1] as SeaturtleForage).include).toEqual('jellyfish');
      });
    });

    when('an array element is already an instance of the nested option', () => {
      then('it leaves the instance as-is', () => {
        const instance = new SeaturtleForage({ include: 'seagrass' });
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: [instance] },
          nested,
          domainObjectName: 'Seaturtle',
        });
        const forage = hydrated.forage as SeaturtleForage[];
        expect(forage[0]).toBeInstanceOf(SeaturtleForage);
        expect(forage[0]!.include).toEqual('seagrass');
      });
    });
  });

  given('a multi-option nested key', () => {
    const nested = {
      forage: [SeaturtleForageInclude, SeaturtleForageExclude],
    };

    when('an array element is a bare scalar', () => {
      then('it passes the scalar through instead of a throw', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: { forage: ['seagrass'] },
          nested,
          domainObjectName: 'Seaturtle',
        });
        const forage = hydrated.forage as string[];
        expect(forage[0]).toEqual('seagrass');
        expect(forage[0]).not.toBeInstanceOf(SeaturtleForageInclude);
        expect(forage[0]).not.toBeInstanceOf(SeaturtleForageExclude);
      });
    });

    when('an array element is an object with a _dobj hint', () => {
      then('it hydrates the object via the hint', () => {
        const hydrated = hydrateNestedDomainObjects({
          props: {
            forage: [{ _dobj: 'SeaturtleForageInclude', include: 'seagrass' }],
          },
          nested,
          domainObjectName: 'Seaturtle',
        });
        const forage = hydrated.forage as SeaturtleForageInclude[];
        expect(forage[0]).toBeInstanceOf(SeaturtleForageInclude);
        expect(forage[0]!.include).toEqual('seagrass');
      });
    });

    when('an array element is an object without a _dobj hint', () => {
      then(
        'it still throws (the bare-value guard does not swallow objects)',
        () => {
          const error = getError(() =>
            hydrateNestedDomainObjects({
              props: { forage: [{ include: 'seagrass' }] },
              nested,
              domainObjectName: 'Seaturtle',
            }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  describe('multi-option structural disambiguation', () => {
    given('[case1] plain object fits exactly one option', () => {
      when('[t0] input fits the species option', () => {
        then('should hydrate into that option, no _dobj needed', () => {
          const turtle = new Seaturtle({
            forage: { slug: 'seagrass' },
            name: 'crush',
          });
          expect(turtle.forage).toBeInstanceOf(SeaturtleForageSpecies);
          expect(turtle.forage).toMatchSnapshot();
        });
      });

      when('[t1] input fits the scope option', () => {
        then('should hydrate into that option, no _dobj needed', () => {
          const squirt = new Seaturtle({
            forage: {
              include: [{ slug: 'seagrass' }],
              exclude: [{ slug: 'jellyfish' }],
            },
            name: 'squirt',
          });
          expect(squirt.forage).toBeInstanceOf(SeaturtleForageScope);
          expect(squirt.forage).toMatchSnapshot();
        });

        then(
          'should also hydrate the nested species within the chosen option',
          () => {
            const squirt = new Seaturtle({
              forage: {
                include: [{ slug: 'seagrass' }],
                exclude: [{ slug: 'jellyfish' }],
              },
              name: 'squirt',
            });
            const scope = squirt.forage as SeaturtleForageScope;
            expect(scope.include[0]).toBeInstanceOf(SeaturtleForageSpecies);
            expect(scope.exclude[0]).toBeInstanceOf(SeaturtleForageSpecies);
          },
        );
      });
    });

    given('[case2] plain object fits zero options', () => {
      when('[t0] input fits neither schema', () => {
        then('should throw a "no option fits" error', () => {
          // deliberately-invalid shape, typed `any` to model bad external input
          const forage: any = { depth: 40 };
          const error = getError(
            () => new Seaturtle({ forage, name: 'crush' }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toContain('no');
          expect(error.message).toMatchSnapshot();
        });
      });
    });

    given('[case3] plain object fits many options', () => {
      // two options with the same (subset) structure → a plain object fits both
      interface SpotBySlug {
        slug: string;
      }
      class SpotBySlug extends DomainObject<SpotBySlug> implements SpotBySlug {
        public static schema = z.object({ slug: z.string() }).strict();
      }
      interface SpotBySlugToo {
        slug: string;
      }
      class SpotBySlugToo
        extends DomainObject<SpotBySlugToo>
        implements SpotBySlugToo
      {
        public static schema = z.object({ slug: z.string() }).strict();
      }
      interface Diver {
        spot: SpotBySlug | SpotBySlugToo;
        name: string;
      }
      class Diver extends DomainObject<Diver> implements Diver {
        public static nested = { spot: [SpotBySlug, SpotBySlugToo] };
      }

      when('[t0] input fits more than one option, no _dobj', () => {
        then(
          'should throw an "ambiguous, disambiguate via _dobj" error',
          () => {
            const error = getError(
              () =>
                new Diver({
                  spot: { slug: 'coral gardens' },
                  name: 'dory',
                }),
            );
            expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
            expect(error.message).toContain('ambiguous');
            expect(error.message).toContain('_dobj');
            expect(error.message).toMatchSnapshot();
          },
        );
      });

      when('[t1] input fits more than one option, with _dobj', () => {
        then('should use the _dobj discriminator directly', () => {
          // `_dobj` is a serialization artifact, not a declared field → typed `any`
          const spot: any = { _dobj: 'SpotBySlugToo', slug: 'coral gardens' };
          const diver = new Diver({ spot, name: 'dory' });
          expect(diver.spot).toBeInstanceOf(SpotBySlugToo);
          expect(diver.spot).toMatchSnapshot();
        });
      });
    });

    given('[case4] _dobj present — checked first, try-each skipped', () => {
      when('[t0] input carries _dobj on a strict multi-option key', () => {
        then('should use _dobj directly', () => {
          // `_dobj` is a serialization artifact, not a declared field → typed `any`
          const forage: any = {
            _dobj: 'SeaturtleForageSpecies',
            slug: 'seagrass',
          };
          const turtle = new Seaturtle({ forage, name: 'crush' });
          expect(turtle.forage).toBeInstanceOf(SeaturtleForageSpecies);
          expect(turtle.forage).toMatchSnapshot();
        });
      });

      when(
        '[t1] schemaless options disambiguated by _dobj (back-compat)',
        () => {
          interface PlantPot {
            diameterInInches: number;
          }
          class PlantPot extends DomainObject<PlantPot> implements PlantPot {}
          interface PlantBed {
            location: string;
          }
          class PlantBed extends DomainObject<PlantBed> implements PlantBed {}
          interface Plant {
            plantedIn: PlantPot | PlantBed;
            lastWatered: string;
          }
          class Plant extends DomainObject<Plant> implements Plant {
            public static nested = { plantedIn: [PlantPot, PlantBed] };
          }

          then('should use _dobj without any schema check', () => {
            // `_dobj` is a serialization artifact, not a declared field → typed `any`
            const plantedIn: any = { _dobj: 'PlantPot', diameterInInches: 7 };
            const plant = new Plant({ plantedIn, lastWatered: 'monday' });
            expect(plant.plantedIn).toBeInstanceOf(PlantPot);
            expect(plant.plantedIn).toMatchSnapshot();
          });
        },
      );

      when('[t2] _dobj names an option that was not declared', () => {
        then('should throw a "._dobj not among declared options" error', () => {
          // `_dobj` is a serialization artifact, not a declared field → typed `any`
          const forage: any = {
            _dobj: 'SeaturtleForageMystery',
            slug: 'seagrass',
          };
          const error = getError(
            () => new Seaturtle({ forage, name: 'crush' }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toContain('_dobj');
          expect(error.message).toContain('SeaturtleForageMystery');
          expect(error.message).toMatchSnapshot();
        });
      });

      when('[t3] _dobj is present but falsy (null)', () => {
        then(
          'should strip it and fall through to try-each, not failfast',
          () => {
            // a falsy `_dobj` skips the discriminator branch; the strip must still happen before
            // try-each, else a strict schema rejects the leftover `_dobj` key as unknown
            const forage: any = { _dobj: null, slug: 'seagrass' };
            const turtle = new Seaturtle({ forage, name: 'crush' });
            expect(turtle.forage).toBeInstanceOf(SeaturtleForageSpecies);
            expect(turtle.forage).toMatchSnapshot();
          },
        );
      });
    });

    given(
      '[case5] try-each requires strict schemas — failfast otherwise',
      () => {
        when('[t0] a fit option has no schema', () => {
          interface SpotTagged {
            slug: string;
          }
          class SpotTagged
            extends DomainObject<SpotTagged>
            implements SpotTagged
          {
            public static schema = z.object({ slug: z.string() }).strict();
          }
          interface SpotBare {
            slug: string;
          }
          // no schema → cannot be trusted for structural disambiguation
          class SpotBare extends DomainObject<SpotBare> implements SpotBare {}
          interface Diver {
            spot: SpotTagged | SpotBare;
            name: string;
          }
          class Diver extends DomainObject<Diver> implements Diver {
            public static nested = { spot: [SpotTagged, SpotBare] };
          }

          then('should failfast, request strict schemas or _dobj', () => {
            const error = getError(
              () =>
                new Diver({
                  spot: { slug: 'coral gardens' },
                  name: 'dory',
                }),
            );
            expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
            expect(error.message).toContain('strict');
            expect(error.message).toMatchSnapshot();
          });
        });

        when('[t1] a fit option has a non-strict schema', () => {
          interface SpotStrict {
            reef: string;
          }
          class SpotStrict
            extends DomainObject<SpotStrict>
            implements SpotStrict
          {
            public static schema = z.object({ reef: z.string() }).strict();
          }
          interface SpotLoose {
            slug: string;
          }
          // non-strict: accepts supersets → a { slug, reef } object would falsely fit
          class SpotLoose extends DomainObject<SpotLoose> implements SpotLoose {
            public static schema = z.object({ slug: z.string() });
          }
          interface Diver {
            spot: SpotStrict | SpotLoose;
            name: string;
          }
          class Diver extends DomainObject<Diver> implements Diver {
            public static nested = { spot: [SpotStrict, SpotLoose] };
          }

          then(
            'should failfast when a non-strict option fits the input',
            () => {
              const error = getError(
                () =>
                  new Diver({
                    spot: { slug: 'kelp forest' },
                    name: 'dory',
                  }),
              );
              expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
              expect(error.message).toContain('strict');
              expect(error.message).toMatchSnapshot();
            },
          );
        });

        when('[t2] a non-strict option does not accept the input', () => {
          // strictness is probed against an object the schema accepts; a non-strict option that does
          // not accept the input can never receive it, so it does not block the strict option that fits
          interface SpotStrict {
            reef: string;
          }
          class SpotStrict
            extends DomainObject<SpotStrict>
            implements SpotStrict
          {
            public static schema = z.object({ reef: z.string() }).strict();
          }
          interface SpotLoose {
            slug: string;
          }
          // non-strict, but its required shape does not match a `{ reef }` input
          class SpotLoose extends DomainObject<SpotLoose> implements SpotLoose {
            public static schema = z.object({ slug: z.string() });
          }
          interface Diver {
            spot: SpotStrict | SpotLoose;
            name: string;
          }
          class Diver extends DomainObject<Diver> implements Diver {
            public static nested = { spot: [SpotStrict, SpotLoose] };
          }

          then(
            'should hydrate into the strict option that fits, no failfast',
            () => {
              const diver = new Diver({
                spot: { reef: 'coral gardens' },
                name: 'dory',
              });
              expect(diver.spot).toBeInstanceOf(SpotStrict);
              expect(diver.spot).toMatchSnapshot();
            },
          );
        });
      },
    );

    given('[case6] already-instantiated option', () => {
      when('[t0] input is already an instance of a valid option', () => {
        then('should keep it as-is', () => {
          const species = new SeaturtleForageSpecies({ slug: 'seagrass' });
          const turtle = new Seaturtle({ forage: species, name: 'crush' });
          expect(turtle.forage).toBeInstanceOf(SeaturtleForageSpecies);
          expect(turtle.forage).toBe(species);
          expect(turtle.forage).toMatchSnapshot();
        });
      });
    });

    given('[case7] disambiguation is schema-lib-agnostic (joi)', () => {
      // joi rejects unknown keys by default → strict; two joi options with distinct required keys
      interface JoiKelp {
        blades: number;
      }
      class JoiKelp extends DomainObject<JoiKelp> implements JoiKelp {
        public static schema = Joi.object({ blades: Joi.number().required() });
      }
      interface JoiCoral {
        polyps: number;
      }
      class JoiCoral extends DomainObject<JoiCoral> implements JoiCoral {
        public static schema = Joi.object({ polyps: Joi.number().required() });
      }
      interface JoiHabitat {
        home: JoiKelp | JoiCoral;
        name: string;
      }
      class JoiHabitat extends DomainObject<JoiHabitat> implements JoiHabitat {
        public static nested = { home: [JoiKelp, JoiCoral] };
      }

      when('[t0] input fits exactly one joi option', () => {
        then('should disambiguate structurally via joi schemas', () => {
          const habitat = new JoiHabitat({
            home: { blades: 12 },
            name: 'nemo',
          });
          expect(habitat.home).toBeInstanceOf(JoiKelp);
          expect(habitat.home).toMatchSnapshot();
        });
      });

      when('[t1] a joi option is non-strict (unknown allowed)', () => {
        interface JoiLoose {
          tag: string;
        }
        class JoiLoose extends DomainObject<JoiLoose> implements JoiLoose {
          public static schema = Joi.object({ tag: Joi.string() }).unknown(
            true,
          );
        }
        interface JoiTight {
          reef: string;
        }
        class JoiTight extends DomainObject<JoiTight> implements JoiTight {
          public static schema = Joi.object({ reef: Joi.string().required() });
        }
        interface JoiHome {
          home: JoiLoose | JoiTight;
          name: string;
        }
        class JoiHome extends DomainObject<JoiHome> implements JoiHome {
          public static nested = { home: [JoiLoose, JoiTight] };
        }

        then('should failfast when a non-strict joi option fits', () => {
          const error = getError(
            () => new JoiHome({ home: { tag: 'anemone' }, name: 'nemo' }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toContain('strict');
          expect(error.message).toMatchSnapshot();
        });
      });
    });

    given('[case8] a declared nested option is not a DomainObject', () => {
      // an option that does not extend DomainObject → the declaration itself is invalid
      class NotADomainObject {
        public slug: string;
        constructor(input: { slug: string }) {
          this.slug = input.slug;
        }
      }
      interface Reef {
        spot: SeaturtleForageSpecies;
        name: string;
      }
      // the invalid option is what this case deliberately exercises → typed `any`
      const spotOptions: any = [SeaturtleForageSpecies, NotADomainObject];
      class Reef extends DomainObject<Reef> implements Reef {
        public static nested = { spot: spotOptions };
      }

      when(
        '[t0] the nested declaration includes a non-DomainObject option',
        () => {
          then('should throw a "must be a DomainObject" error', () => {
            const error = getError(
              () => new Reef({ spot: { slug: 'seagrass' }, name: 'crush' }),
            );
            expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
            expect(error.message).toContain('typeof DomainObject');
            expect(error.message).toMatchSnapshot();
          });
        },
      );
    });

    given('[case9] array-valued nested key with mixed options', () => {
      // a colony forages a list, where each element is one of the two options
      interface SeaturtleColony {
        forages: (SeaturtleForageSpecies | SeaturtleForageScope)[];
        name: string;
      }
      class SeaturtleColony
        extends DomainObject<SeaturtleColony>
        implements SeaturtleColony
      {
        public static nested = {
          forages: [SeaturtleForageSpecies, SeaturtleForageScope],
        };
      }

      when('[t0] the array holds one of each option', () => {
        then(
          'should run try-each per element and hydrate each into its own option',
          () => {
            const colony = new SeaturtleColony({
              forages: [
                { slug: 'seagrass' },
                {
                  include: [{ slug: 'seagrass' }],
                  exclude: [{ slug: 'jellyfish' }],
                },
              ],
              name: 'east reef',
            });
            expect(colony.forages[0]).toBeInstanceOf(SeaturtleForageSpecies);
            expect(colony.forages[1]).toBeInstanceOf(SeaturtleForageScope);
            expect(colony.forages).toMatchSnapshot();
          },
        );
      });

      when('[t1] one array element fits zero options', () => {
        then('should throw a "no option fits" error for that element', () => {
          const forages: any = [{ slug: 'seagrass' }, { depth: 40 }];
          const error = getError(
            () => new SeaturtleColony({ forages, name: 'east reef' }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toContain('no declared nested option');
          expect(error.message).toMatchSnapshot();
        });
      });
    });

    given('[case10] a nullable multi-option nested value is null', () => {
      interface SeaturtleMaybe {
        forage: SeaturtleForageSpecies | SeaturtleForageScope | null;
        name: string;
      }
      class SeaturtleMaybe
        extends DomainObject<SeaturtleMaybe>
        implements SeaturtleMaybe
      {
        public static nested = {
          forage: [SeaturtleForageSpecies, SeaturtleForageScope],
        };
      }

      when('[t0] the nested value is null', () => {
        then('should leave it null — no hydration, no failfast', () => {
          const turtle = new SeaturtleMaybe({ forage: null, name: 'crush' });
          expect(turtle.forage).toEqual(null);
          expect(turtle.forage).toMatchSnapshot();
        });
      });
    });

    given('[case11] single-option fast path still short-circuits', () => {
      interface Reef {
        spot: SeaturtleForageSpecies;
        name: string;
      }
      class Reef extends DomainObject<Reef> implements Reef {
        public static nested = { spot: SeaturtleForageSpecies };
      }

      when('[t0] a single declared option (not an array)', () => {
        then('should build into it directly, no disambiguation', () => {
          const reef = new Reef({ spot: { slug: 'seagrass' }, name: 'crush' });
          expect(reef.spot).toBeInstanceOf(SeaturtleForageSpecies);
          expect(reef.spot).toMatchSnapshot();
        });
      });
    });

    given('[case12] root-level _dobj discriminator is stripped', () => {
      when('[t0] the parent props carry a root _dobj', () => {
        then('should drop _dobj from the hydrated object', () => {
          // root `_dobj` is a serialization artifact on the parent, not a domain field → typed `any`
          const serializedInput: any = {
            forage: { slug: 'seagrass' },
            name: 'crush',
            _dobj: 'Seaturtle',
          };
          const turtle = new Seaturtle(serializedInput);
          expect(turtle).not.toHaveProperty('_dobj');
          expect(turtle.forage).toBeInstanceOf(SeaturtleForageSpecies);
          expect(turtle).toMatchSnapshot();
        });
      });
    });

    given('[case13] plain empty object fits zero options', () => {
      when('[t0] input is an empty object', () => {
        then('should throw a "no option fits" error', () => {
          // an empty object satisfies neither strict schema → fits zero options
          const forage: any = {};
          const error = getError(
            () => new Seaturtle({ forage, name: 'crush' }),
          );
          expect(error).toBeInstanceOf(NestedDomainObjectHydrationError);
          expect(error.message).toContain('no');
          expect(error.message).toMatchSnapshot();
        });
      });
    });
  });
});
