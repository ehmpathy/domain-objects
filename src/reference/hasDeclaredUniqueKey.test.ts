import { hasDeclaredUniqueKey } from './hasDeclaredUniqueKey';

/**
 * .what = direct unit coverage for the shared recursion-gate predicate
 * .why = hasDeclaredUniqueKey is the single source of truth that keeps refByUnique and
 *   getContractRef from drift on the "recurse into this nested dobj's unique ref?" condition;
 *   a bare transformer earns its own unit test (rule.require.test-coverage-by-grain), not only the
 *   indirect coverage it gets through getContractRef's nested-unique cases
 */
const TEST_CASES: {
  description: string;
  given: { dobjClass: { unique?: readonly string[] } | undefined | null };
  expect: boolean;
}[] = [
  {
    description: 'a class that declares a non-empty static unique → true',
    given: { dobjClass: { unique: ['seawaterSecurityNumber'] } },
    expect: true,
  },
  {
    description:
      'a class whose static unique is an empty array → true (the static is declared, just empty)',
    given: { dobjClass: { unique: [] } },
    expect: true,
  },
  {
    description: 'a class that does not declare static unique → false',
    given: { dobjClass: {} },
    expect: false,
  },
  {
    description:
      'a nullish (null) class → false (callers may pass value.constructor)',
    given: { dobjClass: null },
    expect: false,
  },
  {
    description: 'a nullish (undefined) class → false',
    given: { dobjClass: undefined },
    expect: false,
  },
];

describe('hasDeclaredUniqueKey', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(hasDeclaredUniqueKey(thisCase.given.dobjClass)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
