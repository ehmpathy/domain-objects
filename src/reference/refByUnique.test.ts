import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';
import { refByUnique } from './refByUnique';

describe('refByUnique', () => {
  interface SeaTurtle {
    uuid?: string;
    seawaterSecurityNumber: string;
    name: string;
  }
  class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
    public static primary = ['uuid'] as const;
    public static unique = ['seawaterSecurityNumber'] as const;
  }

  it('should extract only the unique key properties from a domain object instance', () => {
    const turtle = new SeaTurtle({
      uuid: '1',
      seawaterSecurityNumber: '821',
      name: 'Crush',
    });
    const ref = refByUnique(turtle);
    expect(ref).toEqual({ seawaterSecurityNumber: '821' });
  });

  it('should have the correct type when generic is provided', () => {
    const turtle = new SeaTurtle({
      uuid: '1',
      seawaterSecurityNumber: '821',
      name: 'Crush',
    });
    const ref = refByUnique<typeof SeaTurtle>(turtle);

    // should be assignable to the unique key shape
    const uk: DomainUniqueKeyShape<typeof SeaTurtle> = ref; // eslint-disable-line @typescript-eslint/no-unused-vars

    // should be able to access the unique key property
    const seawaterSecurityNumber: string = ref.seawaterSecurityNumber; // eslint-disable-line @typescript-eslint/no-unused-vars

    // @ts-expect-error: Property 'name' does not exist on type 'Pick<SeaTurtle, "seawaterSecurityNumber">'.
    const name: string = ref.name; // eslint-disable-line @typescript-eslint/no-unused-vars
  });

  it('should throw an error if the domain object does not declare unique keys', () => {
    interface Fish {
      id: string;
      name: string;
    }
    class Fish extends DomainEntity<Fish> implements Fish {
      public static primary = ['id'] as const;
    }

    const fish = new Fish({ id: '123', name: 'Nemo' });

    expect(() => {
      refByUnique(fish as any);
    }).toThrow('can not create refByUnique on a dobj which does not declare');
  });
});
