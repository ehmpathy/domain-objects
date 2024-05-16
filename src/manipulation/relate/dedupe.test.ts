import { DomainEntity } from '../../instantiation/DomainEntity';
import { DomainLiteral } from '../../instantiation/DomainLiteral';
import { dedupe } from './dedupe';

describe('dedupe', () => {
  interface SeaTurtle {
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
  const turtleOneAlias = new SeaTurtle({
    ...turtleOne,
    name: 'Shellina C.',
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
      turtleOneAlias, // identity dupe
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
      turtleOne, // exact dupe
      turtleOneAlias, // identity dupe
      turtleOne, // exact dupe
      turtleOneAlias, // identity dupe
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].name).toEqual('Shelly C.');
  });
});
