#!/usr/bin/env bun
/**
 * Orchestrates the full development environment:
 * 1. Checks Docker is running and postgres is healthy
 * 2. Starts shared package in watch mode
 * 3. Starts NestJS server in watch mode
 * 4. Starts Vite dev server
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');

interface ServiceConfig {
  name: string;
  color: string;
  cmd: string;
  args: string[];
  cwd: string;
}

const COLORS = {
  shared: '\x1b[35m',  // magenta
  server: '\x1b[33m',  // yellow
  client: '\x1b[36m',  // cyan
  reset:  '\x1b[0m',
};

const services: ServiceConfig[] = [
  {
    name: 'shared',
    color: COLORS.shared,
    cmd: 'bun',
    args: ['run', 'build:watch'],
    cwd: resolve(ROOT, 'shared'),
  },
  {
    name: 'server',
    color: COLORS.server,
    cmd: 'bun',
    args: ['--watch', 'src/main.ts'],
    cwd: resolve(ROOT, 'server'),
  },
  {
    name: 'client',
    color: COLORS.client,
    cmd: 'bun',
    args: ['run', 'dev'],
    cwd: resolve(ROOT, 'client'),
  },
];

function prefixOutput(name: string, color: string, data: Buffer): void {
  const prefix = `${color}[${name}]${COLORS.reset} `;
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      process.stdout.write(`${prefix}${line}\n`);
    }
  }
}

async function checkDockerPostgres(): Promise<void> {
  console.info('Checking PostgreSQL availability...');
  const result = Bun.spawn(['docker', 'compose', 'ps', '--filter', 'status=running', '--format', 'json'], {
    cwd: ROOT,
    stdout: 'pipe',
  });
  await result.exited;

  const out = await new Response(result.stdout).text();
  if (!out.includes('postgres')) {
    console.warn('PostgreSQL container not running. Starting it now...');
    const up = Bun.spawn(['docker', 'compose', 'up', '-d', 'postgres'], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    await up.exited;
    // Wait for postgres to be ready
    console.info('Waiting for PostgreSQL to be healthy...');
    await Bun.sleep(3000);
  }
}

const processes: ChildProcess[] = [];

function cleanup(): void {
  console.info('\nShutting down dev servers...');
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main(): Promise<void> {
  console.info('\x1b[1mKnowledge Graph — Development Environment\x1b[0m\n');

  await checkDockerPostgres();

  // Start shared first, wait a moment for initial build
  const sharedSvc = services[0];
  if (!sharedSvc) throw new Error('shared service not defined');
  console.info(`Starting ${sharedSvc.name}...`);
  const sharedProc = spawn(sharedSvc.cmd, sharedSvc.args, {
    cwd: sharedSvc.cwd,
    shell: false,
  });
  sharedProc.stdout?.on('data', (d: Buffer) => prefixOutput(sharedSvc.name, sharedSvc.color, d));
  sharedProc.stderr?.on('data', (d: Buffer) => prefixOutput(sharedSvc.name, sharedSvc.color, d));
  processes.push(sharedProc);

  // Give shared a moment to produce initial output
  await Bun.sleep(2000);

  // Start server and client in parallel
  for (const svc of services.slice(1)) {
    console.info(`Starting ${svc.name}...`);
    const proc = spawn(svc.cmd, svc.args, { cwd: svc.cwd, shell: false });
    proc.stdout?.on('data', (d: Buffer) => prefixOutput(svc.name, svc.color, d));
    proc.stderr?.on('data', (d: Buffer) => prefixOutput(svc.name, svc.color, d));
    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[${svc.name}] exited with code ${code}`);
      }
    });
    processes.push(proc);
  }

  console.info('\n\x1b[32m✓ All services started\x1b[0m');
  console.info('  Client: \x1b[36mhttp://localhost:3000\x1b[0m');
  console.info('  Server: \x1b[33mhttp://localhost:4000\x1b[0m');
  console.info('  DB:     \x1b[35mlocalhost:5432\x1b[0m\n');
}

main().catch((err: unknown) => {
  console.error('Failed to start dev environment:', err);
  process.exit(1);
});
