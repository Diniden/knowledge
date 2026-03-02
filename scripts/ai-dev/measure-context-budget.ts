#!/usr/bin/env bun
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const _red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

interface FileMetrics {
  file: string;
  wordCount: number;
  estimatedTokens: number;
  alwaysOn: boolean;
}

function estimateTokens(text: string): { words: number; tokens: number } {
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  return { words, tokens: Math.ceil(words * 1.3) };
}

function isAlwaysApply(content: string): boolean {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch?.[1]) return false;
  return /alwaysApply:\s*true/.test(fmMatch[1]);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function measureClaudeMd(): Promise<FileMetrics | null> {
  const path = join(ROOT, 'CLAUDE.md');

  try {
    const content = await readFile(path, 'utf-8');
    const { words, tokens } = estimateTokens(content);
    return {
      file: 'CLAUDE.md',
      wordCount: words,
      estimatedTokens: tokens,
      alwaysOn: true,
    };
  } catch {
    return null;
  }
}

async function measureCursorRules(): Promise<FileMetrics[]> {
  const rulesDir = join(ROOT, '.cursor', 'rules');
  const results: FileMetrics[] = [];

  try {
    const entries = await readdir(rulesDir);

    for (const entry of entries) {
      if (!entry.endsWith('.mdc')) continue;

      const filePath = join(rulesDir, entry);
      const content = await readFile(filePath, 'utf-8');
      const { words, tokens } = estimateTokens(content);
      const alwaysOn = isAlwaysApply(content);

      results.push({
        file: relative(ROOT, filePath),
        wordCount: words,
        estimatedTokens: tokens,
        alwaysOn,
      });
    }
  } catch {
    // Directory may not exist
  }

  return results;
}

async function measureSkills(): Promise<FileMetrics[]> {
  const results: FileMetrics[] = [];

  const rootEntries = await readdir(ROOT);
  for (const entry of rootEntries) {
    if (entry.startsWith('skill-') && entry.endsWith('.md')) {
      const filePath = join(ROOT, entry);
      const content = await readFile(filePath, 'utf-8');
      const { words, tokens } = estimateTokens(content);
      results.push({
        file: entry,
        wordCount: words,
        estimatedTokens: tokens,
        alwaysOn: false,
      });
    }
  }

  const skillsDir = join(ROOT, '.cursor', 'skills');

  if (await fileExists(skillsDir)) {
    const entries = await readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillFile = join(skillsDir, entry.name, 'SKILL.md');

      if (await fileExists(skillFile)) {
        const content = await readFile(skillFile, 'utf-8');
        const { words, tokens } = estimateTokens(content);
        results.push({
          file: relative(ROOT, skillFile),
          wordCount: words,
          estimatedTokens: tokens,
          alwaysOn: false,
        });
      }
    }
  }

  return results;
}

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function padLeft(str: string, len: number): string {
  return ' '.repeat(Math.max(0, len - str.length)) + str;
}

async function main(): Promise<void> {
  console.log(bold('\n📊 Context Budget Measurement\n'));

  const allMetrics: FileMetrics[] = [];
  const warnings: string[] = [];

  const claudeMd = await measureClaudeMd();
  if (claudeMd) allMetrics.push(claudeMd);

  const rules = await measureCursorRules();
  allMetrics.push(...rules);

  const skills = await measureSkills();
  allMetrics.push(...skills);

  if (allMetrics.length === 0) {
    console.log(yellow('  No config files found to measure.'));
    process.exit(0);
  }

  const fileColWidth = Math.max(4, ...allMetrics.map((m) => m.file.length));

  const header = `  ${padRight('File', fileColWidth)}  ${padLeft('Words', 7)}  ${padLeft('~Tokens', 9)}  Always-On`;
  console.log(dim(header));
  console.log(dim('  ' + '─'.repeat(header.length - 2)));

  for (const m of allMetrics) {
    const tokenStr = m.estimatedTokens.toLocaleString();
    const wordStr = m.wordCount.toLocaleString();
    const onTag = m.alwaysOn ? green(' ✓') : dim(' ·');

    console.log(
      `  ${padRight(m.file, fileColWidth)}  ${padLeft(wordStr, 7)}  ${padLeft(tokenStr, 9)}  ${onTag}`,
    );
  }

  console.log('');

  const alwaysOnTotal = allMetrics
    .filter((m) => m.alwaysOn)
    .reduce((sum, m) => sum + m.estimatedTokens, 0);

  const grandTotal = allMetrics.reduce((sum, m) => sum + m.estimatedTokens, 0);

  console.log(
    `  Always-on total:  ${bold(alwaysOnTotal.toLocaleString())} tokens`,
  );
  console.log(
    `  Grand total:      ${bold(grandTotal.toLocaleString())} tokens`,
  );
  console.log('');

  if (alwaysOnTotal > 2000) {
    warnings.push(
      `Always-on rules total (${alwaysOnTotal} tokens) exceeds 2000 token budget`,
    );
  }

  for (const m of allMetrics.filter((m) => m.alwaysOn)) {
    if (m.estimatedTokens > 1000) {
      warnings.push(
        `${m.file} (${m.estimatedTokens} tokens) exceeds 1000 token single-rule budget`,
      );
    }
  }

  if (claudeMd && claudeMd.estimatedTokens > 8000) {
    warnings.push(
      `CLAUDE.md (${claudeMd.estimatedTokens} tokens) exceeds 8000 token budget`,
    );
  }

  if (warnings.length > 0) {
    console.log(yellow('  Warnings:\n'));

    for (const w of warnings) {
      console.log(yellow(`  ⚠ ${w}`));
    }

    console.log('');
  } else {
    console.log(green('  ✓ All within budget thresholds.\n'));
  }

  process.exit(0);
}

main();
