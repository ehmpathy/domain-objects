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
    // ⚠️ this case READ `true` until i011, and the `true` was a defect this suite had recorded as a
    // guarantee. `[]` is truthy, so an empty declaration passed every downstream gate and each one
    // then produced a reference that names no key — `refByUnique` returned `{}`, and
    // `.contract().ref('unique')` picked an empty object and reported success on it. that is q24's
    // failhide reached through the DECLARATION rather than the payload, and the same argument
    // settles both: a reference that names no key is not a reference.
    description:
      'a class whose static unique is an EMPTY array → false (an empty declaration names no key)',
    given: { dobjClass: { unique: [] } },
    expect: false,
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
