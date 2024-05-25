import { given, then } from 'test-fns';

import { DomainEntity } from '../instantiation/DomainEntity';
import { getRef } from './getReferenceTo';

describe('getReferenceTo', () => {
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

    it('should be able to get a reference to it, without primary key', () => {
      const dobj = new SeaTurtle({
        saltwaterSecurityNumber: '821',
        name: 'shellbert',
        age: 7,
      });
      const ref = getRef<typeof SeaTurtle>(dobj);
      expect(ref.of).toEqual(SeaTurtle.name);
      expect(ref.byUnique?.saltwaterSecurityNumber).toEqual('821');
      expect(ref.byPrimary).toEqual(undefined);
    });

    it('should be able to get a reference to it, with primary key', () => {
      const dobj = new SeaTurtle({
        uuid: '__uuid__',
        saltwaterSecurityNumber: '821',
        name: 'shellbert',
        age: 7,
      });
      const ref = getRef(dobj);
      expect(ref.of).toEqual(SeaTurtle.name);
      expect(ref.byUnique?.saltwaterSecurityNumber).toEqual('821');
      expect(ref.byPrimary).toEqual(undefined); // still undefined, since we can only pick one at a time
    });
  });
});
