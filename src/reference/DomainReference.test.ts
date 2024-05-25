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

    it('should be able to define a unique key reference', () => {
      const ref: Ref<typeof SeaTurtle> = {
        byUnique: {
          saltwaterSecurityNumber: '821',
        },
      };
      expect(ref.byUnique.saltwaterSecurityNumber).toEqual('821');
      expect(ref.byPrimary).toEqual(undefined);
    });

    it('should be able to define a primary key ref', () => {
      const ref: Ref<typeof SeaTurtle> = {
        byPrimary: {
          uuid: '__uuid__',
        },
      };
      expect(ref.byPrimary.uuid).toEqual('__uuid__');
      expect(ref.byUnique).toEqual(undefined);
    });

    it('should raise a type error if the unique key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtle> = {
        byUnique: {
          // @ts-expect-error - seawater != saltwater
          seawaterSecurityNumber: '821',
        },
      };
    });

    it('should raise a type error if the primary key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtle> = {
        byPrimary: {
          // @ts-expect-error - guid != uuid
          guid: '821',
        },
      };
    });

    it('should raise a type error if the primary key was not empty', () => {
      const ref: Ref<typeof SeaTurtle> = {
        // @ts-expect-error - must not be empty
        byPrimary: {},
      };
    });

    it('should raise an error if both are declared (since users could define them out of sync)', () => {
      // @ts-expect-error - must choose one
      const ref: Ref<typeof SeaTurtle> = {
        byPrimary: {
          uuid: '821',
        },
        byUnique: {
          saltwaterSecurityNumber: '821',
        },
      };
    });
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
        byUnique: {
          forRegion: 'Great Barrier Reef',
          onDate: 'yesterday',
        },
      };
      expect(ref.byUnique.forRegion).toEqual('Great Barrier Reef');
      expect(ref.byUnique.onDate).toEqual('yesterday');
      expect(ref.byPrimary).toEqual(undefined);
    });

    it('should be able to define a primary key ref', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        byPrimary: {
          uuid: '__uuid__',
        },
      };
      expect(ref.byPrimary.uuid).toEqual('__uuid__');
      expect(ref.byUnique).toEqual(undefined);
    });

    it('should raise a type error if the unique key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        byUnique: {
          // @ts-expect-error - region != forRegion
          region: 'Great Barrier Reef',
          onDate: 'yesterday',
        },
      };
    });

    it('should raise a type error if the primary key was not declared correctly', () => {
      const ref: Ref<typeof SeaTurtleReport> = {
        byPrimary: {
          // @ts-expect-error - guid != uuid
          guid: '821',
        },
      };
    });

    it('should raise an error if both are declared (since users could define them out of sync)', () => {
      // @ts-expect-error - must choose one
      const ref: Ref<typeof SeaTurtleReport> = {
        byPrimary: {
          uuid: '821',
        },
        byUnique: {
          forRegion: 'Great Barrier Reef',
          onDate: 'yesterday',
        },
      };
    });
  });
});
