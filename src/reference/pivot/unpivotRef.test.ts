import { given, then, when } from 'test-fns';
import { PickOne } from 'type-fns';

import { DomainEntity } from '../../instantiation/DomainEntity';
import { RefByUnique } from '../DomainUniqueKeyShape';
import { RefByPivot } from './DomainPivotKey';
import { unpivotRef } from './unpivotRef';

describe('DomainPivotKey', () => {
  given('a Payer', () => {
    enum PayerRole {
      PRODUCER = 'PRODUCER',
      PROVIDER = 'PROVIDER',
      CUSTOMER = 'CUSTOMER',
    }
    interface Payer {
      role: PayerRole;
      exid: string;
    }
    class Payer extends DomainEntity<Payer> implements Payer {
      public static unique = ['role', 'exid'] as const;
    }
    type PayerPivotRef = PickOne<{ [key in Payer['role']]: Payer['exid'] }>;

    when('we attempt to unpivot a pivot ref', () => {
      then('it should satisfy unique ref', () => {
        const producerPivotRef: RefByPivot<Payer, 'role', 'exid'> = {
          PRODUCER: 'bert',
        };
        const producerUniqueRef: RefByUnique<typeof Payer> = unpivotRef<
          Payer,
          'role', // todo: why did we have to specify this key in order for this to work? shouldn't it kno based on input args?
          'exid'
        >(producerPivotRef, 'role', 'exid');
      });
    });
  });
});
