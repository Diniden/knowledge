#!/usr/bin/env bun
/**
 * Checks that all required tools are installed and meet minimum versions.
 */

interface Tool {
  name: string;
  cmd: string[];
  minVersion?: string;
  required: boolean;
}

const TOOLS: Tool[] = [
  { name: 'bun',    cmd: ['bun', '--version'],    minVersion: '1.0.0', required: true },
  { name: 'docker', cmd: ['docker', '--version'],  required: true },
  { name: 'git',    cmd: ['git', '--version'],     required: true },
  { name: 'docker compose', cmd: ['docker', 'compose', 'version'], required: true },
];

async function getToolVersion(cmd: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
    const out = await new Response(proc.stdout).text();
    return out.trim().split('\n')[0] ?? null;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/[^0-9.]/g, '').split('.').map(Number);
  const pb = b.replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function main(): Promise<void> {
  console.info('\x1b[1mChecking dependencies...\x1b[0m\n');

  let allOk = true;

  for (const tool of TOOLS) {
    const version = await getToolVersion(tool.cmd);
    const status = version ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';

    if (!version && tool.required) {
      allOk = false;
      console.info(`  ${status} ${tool.name} — \x1b[31mNOT FOUND\x1b[0m (required)`);
    } else if (!version) {
      console.info(`  ${status} ${tool.name} — not found (optional)`);
    } else if (tool.minVersion && compareVersions(version, tool.minVersion) < 0) {
      allOk = false;
      console.info(`  \x1b[31m✗\x1b[0m ${tool.name} ${version} — \x1b[31mminimum ${tool.minVersion} required\x1b[0m`);
    } else {
      console.info(`  ${status} ${tool.name} — ${version}`);
    }
  }

  console.info('');
  if (allOk) {
    console.info('\x1b[32m✓ All dependencies satisfied\x1b[0m');
  } else {
    console.error('\x1b[31m✗ Some required dependencies are missing\x1b[0m');
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Dependency check failed:', err);
  process.exit(1);
});
