import { given, then, when } from 'test-fns';

import { DomainEntity } from '../../instantiation/DomainEntity';
import { RefByPivot } from './DomainPivotKey';

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

    when('we pivot the dobj', () => {
      then('it should allow specification of valid keys', () => {
        const producer: RefByPivot<Payer, 'role', 'exid'> = {
          PRODUCER: 'bert',
        };
        const provider: RefByPivot<Payer, 'role', 'exid'> = {
          PROVIDER: 'bert',
        };
        const customer: RefByPivot<Payer, 'role', 'exid'> = {
          CUSTOMER: 'bert',
        };
      });

      then('it should block invalid keys ', () => {
        const cucumber: RefByPivot<Payer, 'role', 'exid'> = {
          // @ts-expect-error: 'CUCUMBER' does not exist in type 'DomainPivotKeyShape<Payer, "role", "exid">'.
          CUCUMBER: 'bert',
        };
      });

      then('it should block invalid values ', () => {
        const customer: RefByPivot<Payer, 'role', 'exid'> = {
          // @ts-expect-error: Type '{ uuid: string; }' is not assignable to type 'string'.
          CUSTOMER: { uuid: 'xyz' },
        };
      });
    });
  });
});
