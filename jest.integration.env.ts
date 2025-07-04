// eslint-disable-next-line no-undef
jest.setTimeout(90000); // since we're calling downstream apis

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' || process.env.STAGE) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new Error(`integration.test is not targeting stage 'test'`);

/**
 * .what = verify that the env has sufficient auth to run the tests; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to lack of credentials
 *   - prevent time wasted debugging tests which are failing due to hard-to-read missed credential errors
 */
if (!(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID))
  throw new Error(
    'no aws credentials present. please authenticate with aws to run integration tests',
  );
