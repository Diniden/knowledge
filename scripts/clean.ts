#!/usr/bin/env bun
/**
 * Removes build artifacts, node_modules, and coverage reports.
 * Pass --deep to also remove docker volumes.
 */

import { rm, readdir } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

const ROOT = resolve(import.meta.dir, '..');
const isDeep = process.argv.includes('--deep');

async function removeIfExists(path: string): Promise<void> {
  if (existsSync(path)) {
    await rm(path, { recursive: true, force: true });
    console.info(`  ✓ Removed ${path.replace(ROOT, '')}`);
  }
}

async function findAndRemove(pattern: string): Promise<void> {
  const proc = Bun.spawn(['find', ROOT, '-name', pattern, '-not', '-path', '*/\\.git/*'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
  const output = await new Response(proc.stdout).text();
  const paths = output.trim().split('\n').filter(Boolean);
  for (const p of paths) {
    await removeIfExists(p);
  }
}

async function main(): Promise<void> {
  console.info('\x1b[1mCleaning project...\x1b[0m\n');

  // Remove all node_modules
  const workspaces = ['', 'client', 'server', 'shared', 'packages/mcp-servers', 'packages/claude-code-wrapper'];
  for (const ws of workspaces) {
    await removeIfExists(join(ROOT, ws, 'node_modules'));
  }

  // Remove all dist directories
  for (const ws of workspaces.slice(1)) {
    await removeIfExists(join(ROOT, ws, 'dist'));
  }

  // Remove TypeScript build info files
  await findAndRemove('*.tsbuildinfo');

  // Remove coverage
  await removeIfExists(join(ROOT, 'coverage'));

  if (isDeep) {
    console.info('\nRemoving Docker volumes...');
    const proc = Bun.spawn(['docker', 'compose', 'down', '-v'], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    await proc.exited;
  }

  console.info('\n\x1b[32m✓ Clean complete\x1b[0m');
}

main().catch((err: unknown) => {
  console.error('Clean failed:', err);
  process.exit(1);
});
