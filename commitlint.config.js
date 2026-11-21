module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 140],
    // match the header allowance: a squash-merge turns each commit header
    // into a `* ` body bullet, so a 140-char header becomes a ~142-char body
    // line. keep body lines aligned with the 140-char header cap so a long
    // header can never fail the release-branch commit lint.
    'body-max-line-length': [1, 'always', 140],
    // the same allowance for the footer: a long `Co-Authored-By:` or `Refs:` trailer
    // must never fail a commit lint the body rule would pass
    'footer-max-line-length': [1, 'always', 140],
    'type-enum': [
      2,
      'always',
      [
        'break', // use break: instead of feat!: or BREAKING CHANGE footer
        'feat',
        'fix',
        // 'docs', // prefer fix(docs): instead of docs
        'chore',
        'revert',
        'cont', // continue progress within a p
      ],
    ],
    // forbid ! prefix (use break: instead)
    'subject-exclamation-mark': [2, 'never'],
  },
};
