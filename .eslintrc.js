module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:import/recommended', // specifies good import rules
    'airbnb-typescript/base', // uses the airbnb recommended rules
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: ['unused-imports'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'error', // makes code-reviews easier + code quality better by explicitly defining outputs of exported functions+classes
    '@typescript-eslint/explicit-function-return-type': 'off', // prefer '@typescript-eslint/explicit-module-boundary-types' since it only requires the check on exported functions+classes
    'sort-imports': 'off',
    'import/prefer-default-export': 'off', // default export = bad
    'import/no-default-export': 'error', // require named exports - they make it easier to refactor, enforce consistency, and increase constraints
    '@typescript-eslint/no-non-null-assertion': 'error', // forbid non-null assertion operators for safer code; you can always `?? UnexpectedCodePathError.throw(...)` to fail fast instead
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '!(src)/**/*.ts', // everything outside src/* is a dev only asset
          '**/*.test.ts', // all explicitly .test files are dev only assets too
          '**/*.test.integration.ts',
          '**/*.test.acceptance.ts',
          '**/.test/**/*.ts',
        ],
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off', // todo: error on this asap. for now, not yet possible in this repo
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports', // enforce using `import type` for type-only imports
        fixStyle: 'inline-type-imports', // use inline `import { type Foo }` style
        disallowTypeAnnotations: true, // disallow using `import type` in type annotations
      },
    ],
    'no-unused-vars': 'off', // turn off base rule as it can report incorrect errors
    '@typescript-eslint/no-unused-vars': 'off', // turn off in favor of unused-imports/no-unused-vars
    'unused-imports/no-unused-imports': 'error', // auto-fixable rule to remove unused imports
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    'import/no-cycle': 'off',
    'max-classes-per-file': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    'prefer-destructuring': 'off',
    'lines-between-class-members': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    'no-return-await': 'off', // this does not help anything and actually leads to bugs if we subsequently wrap the return in a try catch without remembering to _then_ add await
    '@typescript-eslint/return-await': 'off',
    '@typescript-eslint/no-unsafe-declaration-merging': 'off', // dobjs are built off of this
    '@typescript-eslint/default-param-last': 'off', // interferes with input vs context
  },
};
