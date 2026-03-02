import { $ } from 'bun';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');

export type PgMode = 'docker' | 'native' | 'none';

export interface PgEnv {
  mode: PgMode;
  /** Superuser name for administrative SQL (e.g. CREATE ROLE, CREATE DATABASE) */
  superuser: string;
}

async function isDockerDbRunning(): Promise<boolean> {
  try {
    const result =
      await $`docker compose ps --status running --format "{{.Service}}"`
        .cwd(ROOT)
        .text();

    return result.split('\n').some((line) => line.trim() === 'db');
  } catch {
    return false;
  }
}

async function isNativePostgresRunning(): Promise<boolean> {
  try {
    const host = process.env['DATABASE_HOST'] ?? 'localhost';
    const port = process.env['DATABASE_PORT'] ?? '5432';
    await $`pg_isready -h ${host} -p ${port}`.quiet();

    return true;
  } catch {
    return false;
  }
}

/**
 * Detect how PostgreSQL is available: via the project's Docker Compose `db`
 * service, a natively-running server, or not at all.
 */
export async function detectPgEnv(): Promise<PgEnv> {
  if (await isDockerDbRunning()) {
    // Docker's POSTGRES_USER is the superuser inside the container
    const superuser = process.env['DATABASE_USER'] ?? 'kg_user';

    return { mode: 'docker', superuser };
  }

  if (await isNativePostgresRunning()) {
    return { mode: 'native', superuser: 'postgres' };
  }

  return { mode: 'none', superuser: 'postgres' };
}

/**
 * Execute a SQL statement via psql, routing through Docker or the native CLI
 * depending on the detected environment.
 */
export async function runPsql(
  env: PgEnv,
  user: string,
  sql: string,
): Promise<void> {
  if (env.mode === 'docker') {
    await $`docker compose exec -T db psql -U ${user} -c ${sql}`
      .cwd(ROOT)
      .quiet();
  } else if (env.mode === 'native') {
    await $`psql -U ${user} -c ${sql}`.quiet();
  } else {
    throw new Error('No PostgreSQL connection available');
  }
}

export function modeLabel(mode: PgMode): string {
  switch (mode) {
    case 'docker':
      return 'Docker container';
    case 'native':
      return 'native server';
    case 'none':
      return 'not available';
  }
}
