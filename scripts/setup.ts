#!/usr/bin/env bun
/**
 * First-time project setup.
 */
import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const root = import.meta.dir + '/..';

console.log('Knowledge Graph Agent System - Setup\n');

// Check bun
const bunVersion = Bun.version;
console.log(`Bun: ${bunVersion}`);

// Install dependencies
console.log('\nInstalling dependencies...');
const install = Bun.spawn({
  cmd: ['bun', 'install'],
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
});
await install.exited;
if ((await install.exited) !== 0) {
  console.error('bun install failed');
  process.exit(1);
}

// Copy .env.example to .env if .env doesn't exist
const envExample = join(root, '.env.example');
const envPath = join(root, '.env');
if (existsSync(envExample) && !existsSync(envPath)) {
  copyFileSync(envExample, envPath);
  console.log('\nCreated .env from .env.example');
} else if (!existsSync(envPath)) {
  console.log('\nNo .env.example found. Create .env manually.');
}

console.log('\nSetup complete. Run `bun dev` to start development.');
