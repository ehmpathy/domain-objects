import Joi from 'joi';

import { DomainEntity } from '../instantiation/DomainEntity';
import { DomainLiteral } from '../instantiation/DomainLiteral';
import { DomainEntityUniqueKeysMustBeDefinedError } from './DomainEntityUniqueKeysMustBeDefinedError';
import { omitMetadataValues } from './omitMetadataValues';

describe('omitMetadataValues', () => {
  describe('literal', () => {
    // define domain object with all metadata values that we support
    interface Tool {
      id?: number;
      uuid?: string;
      createdAt?: string;
      name: string; // e.g. "hammer"
      make: string; // e.g., "black-and-decker"
      model: string; // e.g., "1234"
    }
    class Tool extends DomainLiteral<Tool> implements Tool {}

    it('should correctly omit metadata values', () => {
      // create an instance of it
      const hammer = new Tool({
        id: 821,
        uuid: '__uuid__',
        createdAt: 'yesterday',
        name: 'Hammer',
        make: 'Craftsman',
        model: 'h1',
      });

      // check none of them are defined after omitting
      const hammerWithoutMetadataValues = omitMetadataValues(hammer);
      expect(hammerWithoutMetadataValues.id).toEqual(undefined);
      expect(hammerWithoutMetadataValues.uuid).toEqual(undefined);
      expect(hammerWithoutMetadataValues.createdAt).toEqual(undefined);

      // check that resulting object is still an instance of the literal
      expect(hammerWithoutMetadataValues).toBeInstanceOf(Tool);

      // check that the rest of the values are still accurate
      expect({
        ...hammer,
        id: undefined,
        uuid: undefined,
        createdAt: undefined,
      }).toEqual(hammerWithoutMetadataValues);
    });
    it('should correctly omit metadata values, even if not all metadata values are defined - e.g., id, nothing else', () => {
      // create an instance of it
      const hammer = new Tool({
        id: 821,
        name: 'Hammer',
        make: 'Craftsman',
        model: 'h1',
      });

      // check none of them are defined after omitting
      const hammerWithoutMetadataValues = omitMetadataValues(hammer);
      expect(hammerWithoutMetadataValues.id).toEqual(undefined);
      expect(hammerWithoutMetadataValues.uuid).toEqual(undefined);
      expect(hammerWithoutMetadataValues.createdAt).toEqual(undefined);

      // check that resulting object is still an instance of the literal
      expect(hammerWithoutMetadataValues).toBeInstanceOf(Tool);

      // check that the rest of the values are still accurate
      expect({ ...hammer, id: undefined }).toEqual(hammerWithoutMetadataValues);
    });
    it('should correctly omit metadata values, even if not all metadata values are defined - e.g., none of them are', () => {
      // create an instance of it
      const hammer = new Tool({
        name: 'Hammer',
        make: 'Craftsman',
        model: 'h1',
      });

      // check none of them are defined after omitting
      const hammerWithoutMetadataValues = omitMetadataValues(hammer);
      expect(hammerWithoutMetadataValues.id).toEqual(undefined);
      expect(hammerWithoutMetadataValues.uuid).toEqual(undefined);
      expect(hammerWithoutMetadataValues.createdAt).toEqual(undefined);

      // check that resulting object is still an instance of the literal
      expect(hammerWithoutMetadataValues).toBeInstanceOf(Tool);

      // check that the rest of the values are still accurate
      expect(hammer).toEqual(hammerWithoutMetadataValues);
    });
  });
  describe('entity', () => {
    // define all metadata values that we support on entity
    interface Booster {
      id?: number;
      uuid?: string;
      createdAt?: string;
      updatedAt?: string;
      effectiveAt?: string;
      name: string;
      timesLaunched: number;
      engineVersion: string;
      status: 'ready' | 'testing' | 'preparing';
    }
    class Booster extends DomainEntity<Booster> implements Booster {
      public static unique = ['name']; // for the test, we just care that its unique on anything
    }
    it('should correctly omit metadata values', () => {
      // instantiate the entity
      const booster = new Booster({
        id: 821,
        uuid: '__UUID__',
        createdAt: '__last_year__',
        updatedAt: '__today__',
        effectiveAt: '__yesterday__',
        name: 'pointy end up',
        timesLaunched: 21,
        engineVersion: 'v0.7.1',
        status: 'preparing',
      });

      // check none of them are defined after omitting
      const boosterWithoutMetadataValues = omitMetadataValues(booster);
      expect(boosterWithoutMetadataValues.id).toBeUndefined();
      expect(boosterWithoutMetadataValues.uuid).toBeUndefined();
      expect(boosterWithoutMetadataValues.createdAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.updatedAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.effectiveAt).toBeUndefined();

      // check that resulting object is still an instance of the literal
      expect(boosterWithoutMetadataValues).toBeInstanceOf(Booster);

      // check that the rest of the values are still accurate
      expect({
        ...booster,
        id: undefined,
        uuid: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        effectiveAt: undefined,
      }).toEqual(boosterWithoutMetadataValues);
    });
    it('should correctly omit metadata values, even if not all metadata values are defined - e.g., id, nothing else', () => {
      // instantiate the entity
      const booster = new Booster({
        id: 821,
        name: 'pointy end up',
        timesLaunched: 21,
        engineVersion: 'v0.7.1',
        status: 'preparing',
      });

      // check none of them are defined after omitting
      const boosterWithoutMetadataValues = omitMetadataValues(booster);
      expect(boosterWithoutMetadataValues.id).toBeUndefined();
      expect(boosterWithoutMetadataValues.uuid).toBeUndefined();
      expect(boosterWithoutMetadataValues.createdAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.updatedAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.effectiveAt).toBeUndefined();

      // check that resulting object is still an instance of the literal
      expect(boosterWithoutMetadataValues).toBeInstanceOf(Booster);

      // check that the rest of the values are still accurate
      expect({ ...booster, id: undefined }).toEqual(
        boosterWithoutMetadataValues,
      );
    });
    it('should correctly omit metadata values, even if not all metadata values are defined - e.g., none of them are', () => {
      // instantiate the entity
      const booster = new Booster({
        name: 'pointy end up',
        timesLaunched: 21,
        engineVersion: 'v0.7.1',
        status: 'preparing',
      });

      // check none of them are defined after omitting
      const boosterWithoutMetadataValues = omitMetadataValues(booster);
      expect(boosterWithoutMetadataValues.id).toBeUndefined();
      expect(boosterWithoutMetadataValues.uuid).toBeUndefined();
      expect(boosterWithoutMetadataValues.createdAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.updatedAt).toBeUndefined();
      expect(boosterWithoutMetadataValues.effectiveAt).toBeUndefined();

      // check that resulting object is still an instance of the literal
      expect(boosterWithoutMetadataValues).toBeInstanceOf(Booster);

      // check that the rest of the values are still accurate
      expect(booster).toEqual(boosterWithoutMetadataValues);
    });
    it('should correctly _not_ omit the uuid, if uuid is part of the unique keys', () => {
      interface LotOwner {
        id?: number;
        uuid: string;
        name: string;
        phone: string;
      }
      class LotOwner extends DomainEntity<LotOwner> implements LotOwner {
        public static unique = ['uuid']; // lot owner is unique on uuid, meaning its not metadata
      }

      // instantiate the entity
      const owner = new LotOwner({
        id: 721,
        uuid: '__uuid__',
        name: 'billy bob',
        phone: '5555555555',
      });

      // check none of them are defined after omitting
      const ownerWithoutMetadataValues = omitMetadataValues(owner);
      expect(ownerWithoutMetadataValues.id).toBeUndefined();
      expect(ownerWithoutMetadataValues.uuid).toBeDefined();

      // check that resulting object is still an instance of the entity
      expect(owner).toBeInstanceOf(LotOwner);

      // check that the rest of the values are still accurate
      expect({ ...owner, id: undefined }).toEqual(ownerWithoutMetadataValues);
    });
    it('should correctly _not_ omit the uuid and still instantiate, if uuid is part of the unique keys and schema is defined', () => {
      const schema = Joi.object().keys({
        id: Joi.number().optional(),
        uuid: Joi.string().required(),
        name: Joi.string().required(),
        phone: Joi.string().required(),
      });
      interface LotOwner {
        id?: number;
        uuid: string;
        name: string;
        phone: string;
      }
      class LotOwner extends DomainEntity<LotOwner> implements LotOwner {
        public static schema = schema;
        public static unique = ['uuid']; // lot owner is unique on uuid, meaning its not metadata
      }

      // instantiate the entity
      const owner = new LotOwner({
        id: 721,
        uuid: '__uuid__',
        name: 'billy bob',
        phone: '5555555555',
      });

      // check none of them are defined after omitting
      const ownerWithoutMetadataValues = omitMetadataValues(owner);
      expect(ownerWithoutMetadataValues.id).toBeUndefined();
      expect(ownerWithoutMetadataValues.uuid).toBeDefined();

      // check that resulting object is still an instance of the entity
      expect(owner).toBeInstanceOf(LotOwner);

      // check that the rest of the values are still accurate
      expect({ ...owner, id: undefined }).toEqual(ownerWithoutMetadataValues);
    });
    it('should throw an error if an entity was defined without the unique property being defined, as we cant figure out what the metadata values are otherwise', () => {
      interface LotDweller {
        id?: number;
        uuid: string;
        name: string;
        phone: string;
      }
      class LotDweller extends DomainEntity<LotDweller> implements LotDweller {}

      // instantiate the entity
      const dweller = new LotDweller({
        id: 721,
        uuid: '__uuid__',
        name: 'billy bob',
        phone: '5555555555',
      });

      // check that error is thrown, because we cant figure out whether uuid is metadata or not in this case
      try {
        omitMetadataValues(dweller);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          '`LotDweller.unique` must be defined, to be able to `omitMetadataValues`',
        );
        expect(error).toBeInstanceOf(DomainEntityUniqueKeysMustBeDefinedError);
      }
    });
  });
  describe('nested', () => {
    it('should correctly omit metadata of domain literals nested inside of domain entities', async () => {
      interface Address {
        id?: number;
        uuid?: string;
        city: string;
        state: string;
        country: string;
        continent: string;
        planet: string;
      }
      class Address extends DomainLiteral<Address> implements Address {}
      interface Photo {
        id?: number;
        uuid?: string;
        url: string;
      }
      class Photo extends DomainLiteral<Photo> implements Photo {}
      interface SpacePort {
        id?: number;
        uuid?: string;
        name: string;
        address: Address;
        photos: Photo[];
      }
      class SpacePort extends DomainEntity<SpacePort> implements SpacePort {
        public static unique = ['address']; // lot owner is unique on the address
        public static nested = { address: Address, photos: Photo };
      }
      const starbase = new SpacePort({
        id: 821,
        uuid: '__uuid__',
        name: 'starbase',
        address: new Address({
          id: 721,
          uuid: '__uuid__',
          city: 'Boca Chica',
          state: 'Texas',
          country: 'United States of America',
          continent: 'America',
          planet: 'Earth',
        }),
        photos: [new Photo({ id: 1, uuid: '__uuid__', url: 'https://...' })],
      });
      const starbaseWithoutMetadataValues = omitMetadataValues(starbase);
      expect(starbaseWithoutMetadataValues.id).toBeUndefined();
      expect(starbaseWithoutMetadataValues.uuid).toBeUndefined();
      expect(starbaseWithoutMetadataValues.address.id).toBeUndefined();
      expect(starbaseWithoutMetadataValues.address.uuid).toBeUndefined();
      expect(starbaseWithoutMetadataValues.photos[0]!.id).toBeUndefined();
      expect(starbaseWithoutMetadataValues.photos[0]!.uuid).toBeUndefined();
    });
  });
});
