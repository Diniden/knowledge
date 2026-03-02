export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'client',
        'server',
        'shared',
        'graph',
        'agent',
        'db',
        'config',
        'ci',
        'mcp',
        'docs',
        'scripts',
      ],
    ],
  },
};
