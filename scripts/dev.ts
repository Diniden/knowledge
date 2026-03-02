#!/usr/bin/env bun
/**
 * Orchestrates dev servers: shared (build), server (watch), client (vite).
 */
const pkgRoot = import.meta.dir + '/..';

// Build shared first
const buildShared = Bun.spawn({
  cmd: ['bun', 'run', 'build'],
  cwd: `${pkgRoot}/shared`,
  stdout: 'inherit',
  stderr: 'inherit',
});
await buildShared.exited;
if ((await buildShared.exited) !== 0) process.exit(1);

// Start server and client in parallel (keep process alive)
const server = Bun.spawn({
  cmd: ['bun', 'run', 'dev'],
  cwd: `${pkgRoot}/server`,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});

const client = Bun.spawn({
  cmd: ['bun', 'run', 'dev'],
  cwd: `${pkgRoot}/client`,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});

// Keep running until one exits (then we exit too)
await Promise.race([server.exited, client.exited]);
process.exit(1);
