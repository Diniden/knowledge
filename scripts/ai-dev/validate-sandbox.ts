#!/usr/bin/env bun
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface Violation {
  file: string;
  line: number;
  match: string;
  rule: string;
}

async function collectFiles(
  dir: string,
  extensions: string[],
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof readdir>>;

    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);

      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function scanContent(
  content: string,
  filePath: string,
  patterns: RegExp[],
  rule: string,
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    for (const pattern of patterns) {
      const match = line.match(pattern);

      if (match?.[0]) {
        violations.push({
          file: relative(ROOT, filePath),
          line: i + 1,
          match: match[0],
          rule,
        });
      }
    }
  }

  return violations;
}

async function checkRuntimeFilesForDevRefs(): Promise<Violation[]> {
  const runtimeDir = join(ROOT, 'server', 'src', 'modules', 'agent');
  const files = await collectFiles(runtimeDir, ['.ts', '.js', '.json', '.md']);

  const devRefPatterns = [
    /\.cursor\//,
    /\.claude\//,
    /root\s+CLAUDE\.md/i,
    /\/CLAUDE\.md/,
    /scripts\/ai-dev/,
    /docs\/ai-dev/,
  ];

  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    violations.push(
      ...scanContent(
        content,
        file,
        devRefPatterns,
        'Runtime file references dev config',
      ),
    );
  }

  return violations;
}

async function checkDevConfigForRuntimeRefs(): Promise<Violation[]> {
  const devDirs = [join(ROOT, '.cursor'), join(ROOT, '.claude')];
  const devFiles = [join(ROOT, 'CLAUDE.md')];

  const runtimePatterns = [
    /prompt\s*assembly/i,
    /session\s*management/i,
    /MCP\s*server\s*startup/i,
    /agent-orchestrator\.service/,
    /agent-session\.service/,
    /skills\.service\.ts/,
  ];

  const violations: Violation[] = [];

  for (const dir of devDirs) {
    const files = await collectFiles(dir, [
      '.md',
      '.mdc',
      '.json',
      '.ts',
      '.yml',
      '.yaml',
    ]);

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      violations.push(
        ...scanContent(
          content,
          file,
          runtimePatterns,
          'Dev config references runtime internals',
        ),
      );
    }
  }

  for (const file of devFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      violations.push(
        ...scanContent(
          content,
          file,
          runtimePatterns,
          'Dev config references runtime internals',
        ),
      );
    } catch {
      // File may not exist
    }
  }

  return violations;
}

async function checkNoDevConfigInRuntime(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const forbiddenNames = ['.cursor', '.claude', 'CLAUDE.md', '.cursorrules'];

  const dirsToCheck = [join(ROOT, 'server'), join(ROOT, 'knowledge-graph')];

  for (const dir of dirsToCheck) {
    try {
      await stat(dir);
    } catch {
      continue;
    }

    const files = await collectFiles(dir, [
      '.md',
      '.mdc',
      '.json',
      '.yml',
      '.yaml',
    ]);

    for (const file of files) {
      const basename = file.split('/').pop() ?? '';

      if (forbiddenNames.includes(basename)) {
        violations.push({
          file: relative(ROOT, file),
          line: 0,
          match: basename,
          rule: 'Dev config file found in runtime directory',
        });
      }
    }

    for (const name of ['.cursor', '.claude']) {
      try {
        const checkPath = join(dir, name);
        await stat(checkPath);
        violations.push({
          file: relative(ROOT, checkPath),
          line: 0,
          match: name,
          rule: 'Dev config directory found in runtime directory',
        });
      } catch {
        // Expected — directory doesn't exist
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  console.log(bold('\n🔒 Validating dev/runtime sandbox boundary...\n'));

  const allViolations: Violation[] = [];

  process.stdout.write(
    '  Checking runtime files for dev-config references... ',
  );
  const runtimeViolations = await checkRuntimeFilesForDevRefs();
  allViolations.push(...runtimeViolations);
  console.log(runtimeViolations.length === 0 ? green('PASS') : red('FAIL'));

  process.stdout.write(
    '  Checking dev-config files for runtime references... ',
  );
  const devViolations = await checkDevConfigForRuntimeRefs();
  allViolations.push(...devViolations);
  console.log(devViolations.length === 0 ? green('PASS') : red('FAIL'));

  process.stdout.write('  Checking for dev-config files in runtime dirs... ');
  const misplacedViolations = await checkNoDevConfigInRuntime();
  allViolations.push(...misplacedViolations);
  console.log(misplacedViolations.length === 0 ? green('PASS') : red('FAIL'));

  if (allViolations.length > 0) {
    console.log(
      red(`\n✗ Found ${allViolations.length} boundary violation(s):\n`),
    );

    for (const v of allViolations) {
      const location = v.line > 0 ? `${v.file}:${v.line}` : v.file;
      console.log(red(`  ✗ [${v.rule}]`));
      console.log(`    ${location} — matched: ${yellow(v.match)}`);
    }

    console.log('');
    process.exit(1);
  }

  console.log(green('\n✓ All sandbox boundary checks passed.\n'));
  process.exit(0);
}

main();
