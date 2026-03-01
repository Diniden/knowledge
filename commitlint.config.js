export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'test',
      'chore',
      'ci',
      'perf',
      'revert',
      'build',
    ]],
    'subject-max-length': [1, 'always', 100],
  },
};
