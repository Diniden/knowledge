#!/usr/bin/env bun
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface RuleWarning {
  file: string;
  message: string;
  severity: 'error' | 'warning';
}

interface Frontmatter {
  description?: string;
  globs?: string | string[];
  alwaysApply?: boolean;
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter | null;
  hasBlock: boolean;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!fmMatch?.[1]) {
    return { frontmatter: null, hasBlock: false };
  }

  const fm: Frontmatter = {};
  const lines = fmMatch[1].split('\n');
  let currentKey: string | null = null;
  let arrayValues: string[] = [];

  for (const line of lines) {
    const keyValueMatch = line.match(/^(\w+):\s*(.*)/);

    if (keyValueMatch) {
      if (currentKey === 'globs' && arrayValues.length > 0) {
        fm.globs = arrayValues;
        arrayValues = [];
      }

      const key = keyValueMatch[1];
      const value = keyValueMatch[2]?.trim() ?? '';

      if (key === 'description') {
        fm.description = value;
        currentKey = 'description';
      } else if (key === 'globs') {
        currentKey = 'globs';

        if (value.length > 0) {
          fm.globs = value;
        } else {
          arrayValues = [];
        }
      } else if (key === 'alwaysApply') {
        fm.alwaysApply = value === 'true';
        currentKey = 'alwaysApply';
      } else {
        currentKey = key;
      }
    } else if (currentKey === 'globs') {
      const arrayItemMatch = line.match(/^\s+-\s+"?([^"]*)"?/);

      if (arrayItemMatch?.[1]) {
        arrayValues.push(arrayItemMatch[1]);
      }
    }
  }

  if (currentKey === 'globs' && arrayValues.length > 0) {
    fm.globs = arrayValues;
  }

  return { frontmatter: fm, hasBlock: true };
}

function isReasonableGlob(pattern: string): boolean {
  if (pattern.length === 0) return false;
  if (/[<>|]/.test(pattern)) return false;
  if (pattern.includes('***')) return false;
  return true;
}

function validateRule(filePath: string, content: string): RuleWarning[] {
  const warnings: RuleWarning[] = [];
  const relPath = relative(ROOT, filePath);
  const { frontmatter, hasBlock } = parseFrontmatter(content);

  if (!hasBlock) {
    warnings.push({
      file: relPath,
      message: 'Missing frontmatter block (--- ... ---)',
      severity: 'error',
    });
    return warnings;
  }

  if (!frontmatter) {
    warnings.push({
      file: relPath,
      message: 'Empty frontmatter block',
      severity: 'error',
    });
    return warnings;
  }

  if (!frontmatter.description || frontmatter.description.length === 0) {
    warnings.push({
      file: relPath,
      message: 'Missing required "description" field in frontmatter',
      severity: 'error',
    });
  }

  const hasGlobs = frontmatter.globs !== undefined;
  const hasAlwaysApply = frontmatter.alwaysApply !== undefined;

  if (!hasGlobs && !hasAlwaysApply) {
    warnings.push({
      file: relPath,
      message: 'Frontmatter needs either "globs" or "alwaysApply" field',
      severity: 'error',
    });
  }

  if (hasGlobs && frontmatter.alwaysApply === true) {
    warnings.push({
      file: relPath,
      message:
        'Has both "globs" and "alwaysApply: true" — use one or the other',
      severity: 'warning',
    });
  }

  if (hasGlobs) {
    const globs = Array.isArray(frontmatter.globs)
      ? frontmatter.globs
      : [frontmatter.globs as string];

    for (const glob of globs) {
      if (!isReasonableGlob(glob)) {
        warnings.push({
          file: relPath,
          message: `Suspicious glob pattern: "${glob}"`,
          severity: 'warning',
        });
      }
    }
  }

  return warnings;
}

async function main(): Promise<void> {
  console.log(bold('\n📐 Validating Cursor rules...\n'));

  const rulesDir = join(ROOT, '.cursor', 'rules');
  let entries: string[];

  try {
    entries = await readdir(rulesDir);
  } catch {
    console.log(red('  ✗ .cursor/rules/ directory not found'));
    process.exit(1);
  }

  const mdcFiles = entries.filter((e) => e.endsWith('.mdc'));

  if (mdcFiles.length === 0) {
    console.log(yellow('  ⚠ No .mdc files found in .cursor/rules/'));
    process.exit(0);
  }

  console.log(`  Found ${mdcFiles.length} rule file(s)\n`);

  let errorCount = 0;
  let warningCount = 0;

  for (const file of mdcFiles) {
    const filePath = join(rulesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const warnings = validateRule(filePath, content);

    if (warnings.length === 0) {
      console.log(`  ${green('✓')} ${file}`);
    } else {
      for (const w of warnings) {
        if (w.severity === 'error') {
          console.log(`  ${red('✗')} ${file}: ${w.message}`);
          errorCount++;
        } else {
          console.log(`  ${yellow('⚠')} ${file}: ${w.message}`);
          warningCount++;
        }
      }
    }
  }

  console.log('');

  if (errorCount > 0) {
    console.log(red(`✗ ${errorCount} error(s), ${warningCount} warning(s)\n`));
    process.exit(1);
  }

  if (warningCount > 0) {
    console.log(yellow(`⚠ ${warningCount} warning(s), no errors\n`));
    process.exit(0);
  }

  console.log(green('✓ All Cursor rules valid.\n'));
  process.exit(0);
}

main();
