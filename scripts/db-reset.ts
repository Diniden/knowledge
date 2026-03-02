#!/usr/bin/env bun
import { $ } from 'bun';

import { detectPgEnv, modeLabel, runPsql } from './db-connection.js';

const DB_USER = process.env['DATABASE_USER'] ?? 'kg_user';
const DB_DEV = process.env['DATABASE_NAME'] ?? 'kg_dev';
const DB_TEST = 'kg_test';

async function dbReset() {
  const pgEnv = await detectPgEnv();

  if (pgEnv.mode === 'none') {
    console.error(
      'No PostgreSQL server found. Start PostgreSQL or run: docker compose up db',
    );
    process.exit(1);
  }

  console.log(`Resetting databases (${modeLabel(pgEnv.mode)})...\n`);
  console.log('WARNING: This will destroy all data in the databases.\n');

  for (const db of [DB_DEV, DB_TEST]) {
    try {
      console.log(`  Dropping database "${db}"...`);
      await runPsql(pgEnv, pgEnv.superuser, `DROP DATABASE IF EXISTS ${db};`);

      console.log(`  Recreating database "${db}"...`);
      await runPsql(
        pgEnv,
        pgEnv.superuser,
        `CREATE DATABASE ${db} OWNER ${DB_USER};`,
      );
    } catch (err) {
      console.error(`  Failed to reset "${db}":`, err);
    }
  }

  console.log('\nRunning migrations...');
  try {
    await $`bun run migrate`.cwd(process.cwd());
  } catch {
    console.warn('  Migration step skipped (may not be configured yet).');
  }

  console.log('\nDatabase reset complete.');
}

dbReset().catch((err) => {
  console.error('Database reset failed:', err);
  process.exit(1);
});
