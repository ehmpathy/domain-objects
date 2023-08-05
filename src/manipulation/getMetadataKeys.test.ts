import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainObject } from '../instantiation/DomainObject';
import { getMetadataKeys } from './getMetadataKeys';

describe('getMetadataKeys', () => {
  it('should return the defaults, if not explicitly defined', () => {
    interface Mineral {
      id?: number;
      name: string;
    }
    class Mineral extends DomainObject<Mineral> implements Mineral {}
    const mineral = new Mineral({ name: 'magnesium' });
    const metadataKeys = getMetadataKeys(mineral);
    expect(metadataKeys).toEqual([
      'id',
      'uuid',
      'createdAt',
      'updatedAt',
      'effectiveAt',
    ]);
  });
  it('should return the explicitly defined metadata keys, if defined', () => {
    interface Mineral {
      id?: number;
      uuid?: string;
      name: string;
    }
    class Mineral extends DomainObject<Mineral> implements Mineral {
      public static metadata = ['id', 'uuid'];
    }
    const mineral = new Mineral({ name: 'magnesium' });
    const metadataKeys = getMetadataKeys(mineral);
    expect(metadataKeys).toEqual(['id', 'uuid']);
  });
  it('should not include uuid in the default metadata keys of a DomainEntity which specified uuid as part of its unique key', () => {
    interface Mineral {
      uuid: string;
      name: string;
    }
    class Mineral extends DomainEntity<Mineral> implements Mineral {
      public static unique = ['uuid'];
    }
    const mineral = new Mineral({ uuid: '__UUID__', name: 'magnesium' });
    const metadataKeys = getMetadataKeys(mineral);
    expect(metadataKeys).toEqual([
      'id',
      'createdAt',
      'updatedAt',
      'effectiveAt',
    ]);
  });
});
