#!/usr/bin/env bun
import { $ } from 'bun';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

import type { PgEnv } from './db-connection.js';
import { detectPgEnv, modeLabel } from './db-connection.js';

const ROOT = join(import.meta.dir, '..');
const ENV_EXAMPLE = join(ROOT, '.env.example');
const ENV_FILE = join(ROOT, '.env');

async function checkBun() {
  try {
    const result = await $`bun --version`.text();
    console.log(`  bun: v${result.trim()}`);
    return true;
  } catch {
    console.error('  bun: NOT FOUND - please install bun (https://bun.sh)');
    return false;
  }
}

async function checkPostgres(): Promise<PgEnv> {
  const env = await detectPgEnv();

  switch (env.mode) {
    case 'docker':
    case 'native':
      console.log(`  postgres: running (${modeLabel(env.mode)})`);
      break;

    case 'none': {
      try {
        const result = await $`psql --version`.text();
        console.warn(`  postgres: ${result.trim()} (server not running)`);
      } catch {
        console.warn(
          '  postgres: NOT FOUND - install PostgreSQL, start Docker, or skip DB setup',
        );
      }
      break;
    }
  }

  return env;
}

async function setup() {
  console.log('\n=== Knowledge Graph Platform Setup ===\n');

  console.log('Checking prerequisites...');
  const hasBun = await checkBun();
  if (!hasBun) {
    console.error('\nbun is required. Aborting.');
    process.exit(1);
  }

  const pgEnv = await checkPostgres();

  console.log('\nInstalling dependencies...');
  await $`bun install`.cwd(ROOT);

  if (!existsSync(ENV_FILE)) {
    console.log('\nCreating .env from .env.example...');
    copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log('  Created .env - please update with your settings');
  } else {
    console.log('\n.env already exists, skipping copy.');
  }

  if (pgEnv.mode !== 'none') {
    console.log('\nInitializing database...');
    try {
      await $`bun run scripts/db-init.ts`.cwd(ROOT);
    } catch {
      console.warn('  Database init skipped (may already exist).');
    }
  }

  console.log('\n=== Setup Complete ===');
  console.log('\nNext steps:');
  console.log('  1. Review and update .env with your settings');

  if (pgEnv.mode === 'none') {
    console.log(
      '  2. Start PostgreSQL (native or via Docker: docker compose up db)',
    );
    console.log('  3. Run: bun run scripts/db-init.ts');
    console.log('  4. Run: bun run dev');
  } else {
    console.log('  2. Run: bun run dev');
  }

  console.log('');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
