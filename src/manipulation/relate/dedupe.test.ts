import { getError } from 'test-fns';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';

import { dedupe } from './dedupe';

describe('dedupe', () => {
  interface SeaTurtle {
    id?: number;
    saltwaterSecurityNumber: string;
    name: string;
  }
  class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
    public static unique = ['saltwaterSecurityNumber'];
  }

  interface Region {
    name: string;
  }
  class Region extends DomainLiteral<Region> implements Region {}

  // some entities with a dupe
  const turtleOne = new SeaTurtle({
    saltwaterSecurityNumber: '821',
    name: 'Shelly C.',
  });
  const turtleTwo = new SeaTurtle({
    saltwaterSecurityNumber: '921',
    name: 'Shellbert',
  });
  const turtleOneWithId = new SeaTurtle({
    ...turtleOne,
    id: 821,
  });

  // some literals with a dupe
  const regionOne = new Region({
    name: 'Great Barrier Reef',
  });
  const regionTwo = new Region({
    name: 'Puerto Rico Trench',
  });
  const regionThree = new Region({
    name: 'East Pacific',
  });

  it('should keep only the one instance per distinct identity', () => {
    const deduped = dedupe([
      // entities
      turtleOne,
      turtleTwo,
      turtleTwo, // exact dupe
      turtleOneWithId, // identity dupe
      turtleTwo, // exact dupe
      regionOne,
      regionThree,
      regionTwo,
      regionTwo,
      regionOne,
    ]);
    expect(deduped).toHaveLength(5);
  });
  it('should keep only the first instance per distinct identity', () => {
    const deduped = dedupe([
      turtleOne,
      turtleOneWithId, // identity dupe
      turtleOne, // exact dupe
      turtleOneWithId, // identity dupe
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toEqual(undefined);
  });
  it('should fail fast with a helpful error if there are multiple versions of the same entity, by default', () => {
    const turtleOneWithDiffName = new SeaTurtle({
      ...turtleOne,
      name: 'Shellina C.',
    });
    const error = getError(() => dedupe([turtleOne, turtleOneWithDiffName]));
    expect(error.message).toContain(
      'Two different versions of the same entity were asked to be deduped.',
    );
    expect(error.message).toMatchSnapshot();
  });
  it('should choose the first version if are multiple versions of the same entity and the caller specified this mode', () => {
    const turtleOneWithDiffName = new SeaTurtle({
      ...turtleOne,
      name: 'Shellina C.',
    });

    const deduped = dedupe(
      [
        turtleOne,
        turtleOneWithDiffName, // identity dupe
        turtleOne, // exact dupe
        turtleOneWithDiffName, // identity dupe
      ],
      { onMultipleEntityVersions: 'CHOOSE_FIRST_OCCURRENCE' },
    );
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.name).toEqual('Shelly C.');
  });
  it('should work on literals', () => {
    const namesUnique = dedupe([
      'aurora',
      'shelbert',
      'donahue',
      'aurora',
      'shelbert',
    ]);
    expect(namesUnique).toEqual(['aurora', 'shelbert', 'donahue']);
  });
});
