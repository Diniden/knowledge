#!/usr/bin/env bun
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');
const SCRIPTS_DIR = import.meta.dir;

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface CheckGroup {
  name: string;
  script: string;
}

interface CheckGroupResult {
  name: string;
  passed: boolean;
  output: string;
}

const VALIDATION_GROUPS: CheckGroup[] = [
  { name: 'Sandbox Boundary', script: 'validate-sandbox.ts' },
  { name: 'CLAUDE.md Lint', script: 'lint-claude-md.ts' },
  { name: 'Cursor Rules', script: 'validate-cursor-rules.ts' },
  { name: 'Skill Files', script: 'validate-skills.ts' },
];

const FRESHNESS_DAYS = 60;

async function runScript(
  scriptPath: string,
): Promise<{ exitCode: number; output: string }> {
  const proc = Bun.spawn(['bun', scriptPath], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, output: stdout + stderr };
}

async function checkFileFreshness(): Promise<{
  fresh: boolean;
  message: string;
}> {
  const claudePath = join(ROOT, 'CLAUDE.md');

  try {
    const stats = await stat(claudePath);
    const lastModified = stats.mtime;
    const now = new Date();
    const diffMs = now.getTime() - lastModified.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= FRESHNESS_DAYS) {
      return {
        fresh: false,
        message: `CLAUDE.md last modified ${diffDays} days ago (>${FRESHNESS_DAYS} day threshold)`,
      };
    }

    return {
      fresh: true,
      message: `CLAUDE.md last modified ${diffDays} day(s) ago`,
    };
  } catch {
    return { fresh: false, message: 'CLAUDE.md not found' };
  }
}

async function main(): Promise<void> {
  console.log(bold('\n🏥 AI Dev Config Health Check\n'));
  console.log(bold('━'.repeat(50)));

  const results: CheckGroupResult[] = [];
  let totalPassed = 0;
  let totalChecks = 0;
  const warnings: string[] = [];

  for (const group of VALIDATION_GROUPS) {
    totalChecks++;
    const scriptPath = join(SCRIPTS_DIR, group.script);

    process.stdout.write(`\n  Running: ${bold(group.name)}...`);

    const { exitCode, output } = await runScript(scriptPath);
    const passed = exitCode === 0;

    if (passed) {
      totalPassed++;
      console.log(` ${green('PASSED')}`);
    } else {
      console.log(` ${red('FAILED')}`);
    }

    results.push({ name: group.name, passed, output });
  }

  totalChecks++;
  process.stdout.write(`\n  Running: ${bold('File Freshness')}...`);
  const freshness = await checkFileFreshness();

  if (freshness.fresh) {
    totalPassed++;
    console.log(` ${green('PASSED')}`);
  } else {
    warnings.push(freshness.message);
    console.log(` ${yellow('WARN')}`);
  }

  console.log('\n' + bold('━'.repeat(50)));
  console.log(bold('\n  Summary\n'));

  console.log(`  Checks passed: ${totalPassed}/${totalChecks}`);

  const failedGroups = results.filter((r) => !r.passed);

  if (failedGroups.length > 0) {
    console.log(red(`\n  Failed checks:`));

    for (const group of failedGroups) {
      console.log(red(`    ✗ ${group.name}`));
    }
  }

  if (warnings.length > 0) {
    console.log(yellow(`\n  Warnings:`));

    for (const w of warnings) {
      console.log(yellow(`    ⚠ ${w}`));
    }
  }

  console.log('');

  if (failedGroups.length > 0) {
    console.log(
      red(`✗ Health check failed (${failedGroups.length} check(s) failed).\n`),
    );
    console.log(`  Run individual scripts for details:\n`);

    for (const group of failedGroups) {
      const script = VALIDATION_GROUPS.find((g) => g.name === group.name);
      if (script) {
        console.log(`    bun scripts/ai-dev/${script.script}`);
      }
    }

    console.log('');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(yellow('⚠ Health check passed with warnings.\n'));
    process.exit(0);
  }

  console.log(green('✓ All health checks passed.\n'));
  process.exit(0);
}

main();
