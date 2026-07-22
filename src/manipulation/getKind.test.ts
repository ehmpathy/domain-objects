import { given, then, when } from 'test-fns';

import { DomainEntity } from '@src/instantiation/DomainEntity';
import { DomainEvent } from '@src/instantiation/DomainEvent';
import { DomainLiteral } from '@src/instantiation/DomainLiteral';
import { DomainObject } from '@src/instantiation/DomainObject';

import { getKind } from './getKind';

describe('getKind', () => {
  given('a class that extends DomainEntity', () => {
    interface Seaturtle {
      uuid?: string;
      name: string;
    }
    class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
      public static primary = ['uuid'] as const;
    }

    when('kind is read from the class', () => {
      then('it reads entity from the entity marker', () => {
        expect(getKind(Seaturtle)).toEqual('entity');
      });
    });
  });

  given('a class that extends DomainLiteral', () => {
    interface Sandbar {
      latitude: number;
      longitude: number;
    }
    class Sandbar extends DomainLiteral<Sandbar> implements Sandbar {}

    when('kind is read from the class', () => {
      then('it reads literal from the literal marker', () => {
        expect(getKind(Sandbar)).toEqual('literal');
      });
    });
  });

  given('a class that extends DomainEvent', () => {
    interface WaveObservedEvent {
      sensorUuid: string;
      occurredAt: string;
    }
    class WaveObservedEvent
      extends DomainEvent<WaveObservedEvent>
      implements WaveObservedEvent
    {
      public static unique = ['sensorUuid', 'occurredAt'] as const;
    }

    when('kind is read from the class', () => {
      then('it reads event from the event marker', () => {
        expect(getKind(WaveObservedEvent)).toEqual('event');
      });
    });
  });

  given('a class that extends the base DomainObject only', () => {
    interface Seafoam {
      bubbles: number;
    }
    class Seafoam extends DomainObject<Seafoam> implements Seafoam {}

    when('kind is read from the class', () => {
      then('it falls back to object with no subclass marker', () => {
        expect(getKind(Seafoam)).toEqual('object');
      });
    });
  });

  given('a base DomainObject that declares primary + unique keys', () => {
    // the feature's thesis: kind follows the subclass marker, not key presence.
    // a base DomainObject with keys is still object, not entity.
    interface Driftwood {
      uuid?: string;
      grain: string;
    }
    class Driftwood extends DomainObject<Driftwood> implements Driftwood {
      public static primary = ['uuid'] as const;
      public static unique = ['grain'] as const;
    }

    when('kind is read from the class', () => {
      then('it reads object, not entity, despite the keys', () => {
        expect(getKind(Driftwood)).toEqual('object');
      });
    });
  });

  given('a 2-level subclass of DomainEntity', () => {
    interface Seaturtle {
      uuid?: string;
    }
    class Seaturtle extends DomainEntity<Seaturtle> implements Seaturtle {
      public static primary = ['uuid'] as const;
    }
    interface GreenSeaturtle extends Seaturtle {
      shellPattern: string;
    }
    class GreenSeaturtle extends Seaturtle implements GreenSeaturtle {}

    when('kind is read from the deeper subclass', () => {
      then('it still reads entity through the inherited static marker', () => {
        expect(getKind(GreenSeaturtle)).toEqual('entity');
      });
    });
  });
});
