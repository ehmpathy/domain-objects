import { given, then } from 'test-fns';

import { DomainEntity } from '../instantiation/DomainEntity';
import { Ref } from './DomainReference';

describe('DomainReference', () => {
  given('a domain entity', () => {
    interface SeaTurtle {
      uuid?: string;
      saltwaterSecurityNumber: string; // 😂
      name: string;
      age: number;
    }
    class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
      public static primary = ['uuid'] as const;
      public static unique = ['saltwaterSecurityNumber'] as const;
    }

    interface EarthWorm {
      uuid?: string;
      soilSecurityNumber: string; // 😂
      wormSegmentNumber: string; // when an earthworm is cut, each segment becomes a new worm
      name: string;
      age: number;
    }
    class EarthWorm extends DomainEntity<EarthWorm> implements EarthWorm {
      public static primary = ['uuid'] as const;
      public static unique = [
        'soilSecurityNumber',
        'wormSegmentNumber',
      ] as const;
    }

    it('should be able to define a unique key reference', () => {
      const ref: Ref<typeof SeaTurtle> = {
        saltwaterSecurityNumber: '821',
      };
      expect(ref.saltwaterSecurityNumber).toEqual('821');

      // @ts-expect-error; uuid does not exist
      expect(ref.uuid).toEqual(undefined);
    });

    it('should be able to define a primary key ref', () => {
      const ref: Ref<typeof SeaTurtle> = {
        uuid: '__uuid__',
      };
      expect(ref.uuid).toEqual('__uuid__');

      // @ts-expect-error; saltwaterSecurityNumber does not exist
      expect(ref.saltwaterSecurityNumber).toEqual(undefined);
    });

    it('should raise a type error if the unique key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtle> = {
        // @ts-expect-error - seawater != saltwater
        seawaterSecurityNumber: '821',
      };
    });

    it('should raise a type error if the primary key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtle> = {
        // @ts-expect-error - guid != uuid
        guid: '821',
      };
    });

    it('should raise a type error if unique key wasnt fully defined', () => {
      // @ts-expect-error; Property 'wormSegmentNumber' is missing in type
      const ref: Ref<typeof EarthWorm> = {
        soilSecurityNumber: '29131',
      };
    });

    it('should raise a type error neither key was defined', () => {
      // @ts-expect-error - must not be empty
      const ref: Ref<typeof SeaTurtle> = {};
    });

    then.todo(
      'should raise an error if both are declared (since users could define them out of sync)',
      () => {
        const ref: Ref<typeof SeaTurtle> = {
          uuid: '821',
          saltwaterSecurityNumber: '821',
        };
      },
    );
  });

  given('a domain event', () => {
    interface SeaTurtleReport {
      uuid?: string;
      forRegion: string;
      onDate: string;
      population: number;
    }
    class SeaTurtleReport
      extends DomainEntity<SeaTurtleReport>
      implements SeaTurtleReport
    {
      public static primary = ['uuid'] as const;
      public static unique = ['forRegion', 'onDate'] as const;
    }

    it('should be able to define a unique key reference', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        forRegion: 'Great Barrier Reef',
        onDate: 'yesterday',
      };
      expect(ref.forRegion).toEqual('Great Barrier Reef');
      expect(ref.onDate).toEqual('yesterday');

      // @ts-expect-error; uuid does not exist on unique
      expect(ref.uuid).toEqual(undefined);
    });

    it('should be able to define a primary key ref', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        uuid: '__uuid__',
      };
      expect(ref.uuid).toEqual('__uuid__');

      // @ts-expect-error; forRegion does not exist on primary
      expect(ref.forRegion).toEqual(undefined);
    });

    it('should raise a type error if the unique key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        // @ts-expect-error - region != forRegion
        region: 'Great Barrier Reef',
        onDate: 'yesterday',
      };
    });

    it('should raise a type error if the primary key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        // @ts-expect-error - guid != uuid
        guid: '821',
      };
    });

    then.todo(
      'should raise an error if both are declared (since users could define them out of sync)',
      () => {
        const ref: Ref<typeof SeaTurtleReport> = {
          uuid: '821',
          forRegion: 'Great Barrier Reef',
          onDate: 'yesterday',
        };
      },
    );
  });
});
