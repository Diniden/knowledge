#!/usr/bin/env bun
/**
 * Validates workspace integrity:
 * - All package.json files are valid
 * - All workspace dependencies resolve
 * - Shared types compile
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');

const WORKSPACES = [
  '',
  'client',
  'server',
  'shared',
  'packages/mcp-servers',
  'packages/claude-code-wrapper',
];

async function validatePackageJson(ws: string): Promise<void> {
  const path = resolve(ROOT, ws, 'package.json');
  try {
    const content = await readFile(path, 'utf-8');
    JSON.parse(content);
    console.info(`  ✓ ${ws || 'root'}/package.json`);
  } catch (err) {
    throw new Error(`Invalid package.json at ${ws}: ${err}`);
  }
}

async function runTypeCheck(): Promise<void> {
  const proc = Bun.spawn(['bunx', 'tsc', '--build', '--noEmit'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  if (code !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`TypeScript compilation failed:\n${stderr}`);
  }
  console.info('  ✓ TypeScript compilation');
}

async function main(): Promise<void> {
  console.info('\x1b[1mValidating workspace...\x1b[0m\n');

  console.info('Validating package.json files:');
  for (const ws of WORKSPACES) {
    await validatePackageJson(ws);
  }

  console.info('\nRunning type check:');
  await runTypeCheck();

  console.info('\n\x1b[32m✓ Workspace validation passed\x1b[0m');
}

main().catch((err: unknown) => {
  console.error('\n\x1b[31mValidation failed:\x1b[0m', err);
  process.exit(1);
});
