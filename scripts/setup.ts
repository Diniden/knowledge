#!/usr/bin/env bun
/**
 * First-time project setup:
 * 1. Checks prerequisites (bun, docker, git)
 * 2. Runs bun install
 * 3. Copies .env.example → .env if needed
 * 4. Starts Docker services
 * 5. Waits for PostgreSQL
 * 6. Runs migrations
 * 7. Prints success instructions
 */

import { existsSync } from 'fs';
import { copyFile } from 'fs/promises';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');

async function run(cmd: string, args: string[], cwd = ROOT): Promise<void> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`);
  }
}

async function getVersion(cmd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn([cmd, ...args], { stdout: 'pipe', stderr: 'pipe' });
  await proc.exited;
  return (await new Response(proc.stdout).text()).trim();
}

async function checkPrerequisites(): Promise<void> {
  console.info('Checking prerequisites...');

  const bunVersion = await getVersion('bun', ['--version']).catch(() => null);
  if (!bunVersion) {
    throw new Error('bun is not installed. Install from https://bun.sh');
  }
  console.info(`  ✓ bun ${bunVersion}`);

  const dockerVersion = await getVersion('docker', ['--version']).catch(() => null);
  if (!dockerVersion) {
    throw new Error('docker is not installed. Install from https://docker.com');
  }
  console.info(`  ✓ ${dockerVersion}`);

  const gitVersion = await getVersion('git', ['--version']).catch(() => null);
  if (!gitVersion) {
    throw new Error('git is not installed');
  }
  console.info(`  ✓ ${gitVersion}`);
}

async function setupEnv(): Promise<void> {
  const envPath = resolve(ROOT, '.env');
  const examplePath = resolve(ROOT, '.env.example');

  if (!existsSync(envPath)) {
    console.info('Creating .env from .env.example...');
    await copyFile(examplePath, envPath);
    console.info('  ✓ .env created — please review and update values before running the app');
  } else {
    console.info('  ✓ .env already exists');
  }
}

async function waitForPostgres(maxAttempts = 20): Promise<void> {
  console.info('Waiting for PostgreSQL to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    const proc = Bun.spawn(
      ['docker', 'compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', 'postgres'],
      { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' },
    );
    const code = await proc.exited;
    if (code === 0) {
      console.info('  ✓ PostgreSQL is ready');
      return;
    }
    await Bun.sleep(1500);
    process.stdout.write('.');
  }
  throw new Error('PostgreSQL failed to become ready in time');
}

async function main(): Promise<void> {
  console.info('\x1b[1m\nKnowledge Graph Agent System — Project Setup\x1b[0m\n');

  await checkPrerequisites();

  console.info('\nInstalling dependencies...');
  await run('bun', ['install']);
  console.info('  ✓ Dependencies installed');

  await setupEnv();

  console.info('\nStarting Docker services...');
  await run('docker', ['compose', 'up', '-d', 'postgres']);
  await waitForPostgres();

  console.info('\n\x1b[1m\x1b[32m✓ Setup complete!\x1b[0m\n');
  console.info('Next steps:');
  console.info('  1. Review and update \x1b[33m.env\x1b[0m with your configuration');
  console.info('  2. Run \x1b[36mbun run migrate\x1b[0m to set up the database schema');
  console.info('  3. Run \x1b[36mbun dev\x1b[0m to start the development environment\n');
}

main().catch((err: unknown) => {
  console.error('\n\x1b[31mSetup failed:\x1b[0m', err);
  process.exit(1);
});
