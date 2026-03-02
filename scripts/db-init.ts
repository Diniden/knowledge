#!/usr/bin/env bun
import { detectPgEnv, modeLabel, runPsql } from './db-connection.js';

const DB_USER = process.env['DATABASE_USER'] ?? 'kg_user';
const DB_PASSWORD = process.env['DATABASE_PASSWORD'] ?? 'changeme';
const DB_DEV = process.env['DATABASE_NAME'] ?? 'kg_dev';
const DB_TEST = 'kg_test';

async function dbInit() {
  const pgEnv = await detectPgEnv();

  if (pgEnv.mode === 'none') {
    console.error(
      'No PostgreSQL server found. Start PostgreSQL or run: docker compose up db',
    );
    process.exit(1);
  }

  console.log(`Initializing databases (${modeLabel(pgEnv.mode)})...\n`);

  try {
    console.log(`  Creating role "${DB_USER}"...`);
    await runPsql(
      pgEnv,
      pgEnv.superuser,
      `CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB;`,
    );
  } catch {
    console.log(`  Role "${DB_USER}" may already exist, continuing.`);
  }

  try {
    console.log(`  Creating database "${DB_DEV}"...`);
    await runPsql(
      pgEnv,
      pgEnv.superuser,
      `CREATE DATABASE ${DB_DEV} OWNER ${DB_USER};`,
    );
  } catch {
    console.log(`  Database "${DB_DEV}" may already exist, continuing.`);
  }

  try {
    console.log(`  Creating database "${DB_TEST}"...`);
    await runPsql(
      pgEnv,
      pgEnv.superuser,
      `CREATE DATABASE ${DB_TEST} OWNER ${DB_USER};`,
    );
  } catch {
    console.log(`  Database "${DB_TEST}" may already exist, continuing.`);
  }

  console.log('\nDatabase initialization complete.');
}

dbInit().catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
