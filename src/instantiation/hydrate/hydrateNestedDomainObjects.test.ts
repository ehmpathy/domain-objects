import { getError, given, then, when } from 'test-fns';

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
});
