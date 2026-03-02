#!/usr/bin/env bun
import { rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const ROOT = join(import.meta.dir, '..');

const DIRS_TO_CLEAN = [
  'node_modules',
  'shared/node_modules',
  'shared/dist',
  'client/node_modules',
  'client/dist',
  'server/node_modules',
  'server/dist',
  'packages/mcp-servers/node_modules',
  'packages/mcp-servers/dist',
  'packages/claude-code-wrapper/node_modules',
  'packages/claude-code-wrapper/dist',
  'coverage',
];

const PATTERNS_TO_CLEAN = ['*.tsbuildinfo'];

async function clean() {
  console.log('Cleaning build artifacts...\n');

  for (const dir of DIRS_TO_CLEAN) {
    const fullPath = join(ROOT, dir);
    if (existsSync(fullPath)) {
      console.log(`  Removing ${dir}/`);
      await rm(fullPath, { recursive: true, force: true });
    }
  }

  const { globSync } = await import('glob' as string).catch(() => ({
    globSync: () => [] as string[],
  }));

  for (const pattern of PATTERNS_TO_CLEAN) {
    const matches = globSync(join(ROOT, '**', pattern), {
      ignore: ['**/node_modules/**'],
    }) as string[];

    for (const match of matches) {
      console.log(`  Removing ${match.replace(ROOT + '/', '')}`);
      await rm(match, { force: true });
    }
  }

  console.log('\nClean complete.');
}

clean().catch((err) => {
  console.error('Clean failed:', err);
  process.exit(1);
});
