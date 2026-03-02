#!/usr/bin/env bun
/**
 * Build orchestration: shared -> server -> client
 */
const pkgRoot = import.meta.dir + '/..';

async function run(cmd: string[], cwd: string): Promise<number> {
  const proc = Bun.spawn({ cmd, cwd, stdout: 'inherit', stderr: 'inherit' });
  return (await proc.exited) as number;
}

let exitCode = 0;

exitCode = await run(['bun', 'run', 'build'], `${pkgRoot}/shared`);
if (exitCode !== 0) process.exit(exitCode);

exitCode = await run(['bun', 'run', 'build'], `${pkgRoot}/server`);
if (exitCode !== 0) process.exit(exitCode);

exitCode = await run(['bun', 'run', 'build'], `${pkgRoot}/client`);
if (exitCode !== 0) process.exit(exitCode);

console.log('Build complete.');
