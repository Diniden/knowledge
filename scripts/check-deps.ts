import { $ } from 'bun';

interface CheckResult {
  name: string;
  ok: boolean;
  version?: string;
}

async function checkVersion(
  cmd: string,
  name: string,
): Promise<CheckResult> {
  try {
    const result = await $`${cmd} --version`.text();
    return { name, ok: true, version: result.trim().split('\n')[0] };
  } catch {
    return { name, ok: false };
  }
}

async function main() {
  console.info('Dependency Check\n');

  const checks = await Promise.all([
    checkVersion('bun', 'Bun'),
    checkVersion('docker', 'Docker'),
    checkVersion('git', 'Git'),
    checkVersion('node', 'Node.js (optional)'),
  ]);

  let allOk = true;
  for (const check of checks) {
    const status = check.ok ? 'OK' : 'MISSING';
    const version = check.version ? ` (${check.version})` : '';
    console.info(`  [${status}] ${check.name}${version}`);
    if (!check.ok && check.name !== 'Node.js (optional)') allOk = false;
  }

  try {
    await $`docker compose version`.quiet();
    console.info('  [OK] Docker Compose');
  } catch {
    console.info('  [MISSING] Docker Compose');
    allOk = false;
  }

  console.info(allOk ? '\nAll required dependencies found.' : '\nSome dependencies are missing.');
  process.exit(allOk ? 0 : 1);
}

main();
