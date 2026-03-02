import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

let sql: postgres.Sql | null = null;

export async function setupTestDatabase() {
  sql = postgres({
    host: process.env['DATABASE_HOST'] ?? 'localhost',
    port: Number(process.env['DATABASE_PORT'] ?? 5432),
    database: process.env['DATABASE_NAME'] ?? 'kg_test',
    user: process.env['DATABASE_USER'] ?? 'kg_user',
    password: process.env['DATABASE_PASSWORD'] ?? 'changeme',
  });

  return drizzle(sql, { schema });
}

export async function teardownTestDatabase() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export async function truncateAllTables() {
  if (!sql) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.',
    );
  }

  await sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `;
}
