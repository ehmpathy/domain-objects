import { DomainEntity } from '../instantiation/DomainEntity';
import { RefByPrimary } from './RefByPrimary.type';
import { refByPrimary } from './refByPrimary';

describe('refByPrimary', () => {
  interface SeaTurtle {
    uuid?: string;
    seawaterSecurityNumber: string;
    name: string;
  }
  class SeaTurtle extends DomainEntity<SeaTurtle> implements SeaTurtle {
    public static primary = ['uuid'] as const;
    public static unique = ['seawaterSecurityNumber'] as const;
  }

  it('should extract only the primary key properties from a domain object instance', () => {
    const turtle = new SeaTurtle({
      uuid: 'some-uuid',
      seawaterSecurityNumber: '821',
      name: 'Crush',
    });
    const ref = refByPrimary(turtle);
    expect(ref).toEqual({ uuid: 'some-uuid' });
  });

  it('should have the correct type when generic is provided', () => {
    const turtle = new SeaTurtle({
      uuid: 'some-uuid',
      seawaterSecurityNumber: '821',
      name: 'Crush',
    });
    const ref = refByPrimary<typeof SeaTurtle>(turtle);

    // should be assignable to the primary key shape
    const pk: RefByPrimary<typeof SeaTurtle> = ref; // eslint-disable-line @typescript-eslint/no-unused-vars

    // should be able to access the primary key property
    const uuid: string = ref.uuid; // eslint-disable-line @typescript-eslint/no-unused-vars

    // @ts-expect-error: Property 'name' does not exist on type 'Required<Pick<SeaTurtle, "uuid">>'.
    const name: string = ref.name; // eslint-disable-line @typescript-eslint/no-unused-vars
  });

  it('should throw an error if the domain object does not declare primary keys', () => {
    interface Fish {
      name: string;
    }
    class Fish extends DomainEntity<Fish> implements Fish {}

    const fish = new Fish({ name: 'Nemo' });

    expect(() => {
      refByPrimary(fish as any);
    }).toThrow('can not create refByPrimary on a dobj which does not declare');
  });
});
