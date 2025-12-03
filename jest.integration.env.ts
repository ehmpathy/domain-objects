import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // since we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new Error('no package.json found in cwd. are you @gitroot?');

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' ||
    (process.env.STAGE && process.env.STAGE !== 'test')) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new Error(`integration.test is not targeting stage 'test'`);

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to lack of credentials
 *   - prevent time wasted debugging tests which are failing due to hard-to-read missed credential errors
 */
const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
const declapractUseContent = existsSync(declapractUsePath)
  ? readFileSync(declapractUsePath, 'utf8')
  : '';
const requiresAwsAuth = declapractUseContent.includes('awsAccountId');
if (
  requiresAwsAuth &&
  !(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
)
  throw new Error(
    'no aws credentials present. please authenticate with aws to run integration tests',
  );

/**
 * .what = verify that the testdb has been provisioned if a databaseUserName is declared
 * .why =
 *   - prevent time wasted waiting on tests to fail due to missing testdb
 *   - prevent confusing "password authentication failed" errors when testdb isn't running or was provisioned for a different repo
 */
const requiresTestDb = declapractUseContent.includes('databaseUserName');
if (requiresTestDb) {
  const testConfigPath = join(process.cwd(), 'config', 'test.json');
  if (!existsSync(testConfigPath))
    throw new Error(
      'config/test.json not found but serviceUser is declared in declapract.use.yml',
    );
  const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf8'));
  if (
    !testConfig.database?.tunnel?.local ||
    !testConfig.database?.role?.crud ||
    !testConfig.database?.target?.database
  )
    throw new Error(
      'config/test.json database.tunnel.local, database?.role?.crud, or database?.target?.database not found but expected',
    );
  try {
    execSync(
      `PGPASSWORD="${testConfig.database.role.crud.password}" psql -h ${testConfig.database.tunnel.local.host} -p ${testConfig.database.tunnel.local.port} -U ${testConfig.database.role.crud.username} -d ${testConfig.database.target.database} -c "SELECT 1" > /dev/null 2>&1`,
      { timeout: 3000 },
    );
  } catch {
    throw new Error(
      `did you forget to \`npm run start:testdb\`? cant connect to database`,
    );
  }
}
