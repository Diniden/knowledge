import { existsSync } from 'fs';

const workspaces = [
  { name: '@kg/shared', path: 'shared/package.json' },
  { name: '@kg/client', path: 'client/package.json' },
  { name: '@kg/server', path: 'server/package.json' },
  { name: '@kg/mcp-servers', path: 'packages/mcp-servers/package.json' },
  { name: '@kg/claude-code-wrapper', path: 'packages/claude-code-wrapper/package.json' },
];

async function main() {
  console.info('Workspace Validation\n');
  let allOk = true;

  for (const ws of workspaces) {
    if (existsSync(ws.path)) {
      const pkg = await Bun.file(ws.path).json();
      if (pkg.name === ws.name) {
        console.info(`  [OK] ${ws.name} — ${ws.path}`);
      } else {
        console.error(`  [ERR] ${ws.path} has name "${pkg.name}", expected "${ws.name}"`);
        allOk = false;
      }
    } else {
      console.error(`  [MISSING] ${ws.path}`);
      allOk = false;
    }
  }

  const tsconfigFiles = [
    'tsconfig.base.json',
    'tsconfig.json',
    'shared/tsconfig.json',
    'client/tsconfig.json',
    'server/tsconfig.json',
  ];

  console.info('\nTypeScript configs:');
  for (const f of tsconfigFiles) {
    if (existsSync(f)) {
      console.info(`  [OK] ${f}`);
    } else {
      console.error(`  [MISSING] ${f}`);
      allOk = false;
    }
  }

  console.info(allOk ? '\nAll workspace checks passed.' : '\nSome checks failed.');
  process.exit(allOk ? 0 : 1);
}

main();
