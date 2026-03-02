#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

type CheckStatus = 'pass' | 'fail' | 'warn';

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

const REQUIRED_SECTIONS = [
  'Knowledge Graph Agent System',
  'Domain Boundary',
  'Tech Stack',
  'Coding Standards',
  'Project Structure',
  'Workflow Commands',
  'Agent Delegation',
  'Skill Reference Index',
  'Do-Not Rules',
] as const;

const RUNTIME_PATTERNS = [
  /prompt\s*assembly/i,
  /session\s*management/i,
  /MCP\s*server\s*startup/i,
  /agent-orchestrator\.service/,
  /agent-session\.service/,
  /skills\.service\.ts/,
];

function estimateTokens(text: string): number {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.ceil(wordCount * 1.3);
}

function extractHeadings(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.startsWith('#'))
    .map((line) => line.replace(/^#+\s*/, '').trim());
}

function checkRequiredSections(content: string): CheckResult {
  const headings = extractHeadings(content);
  const missing: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    const found = headings.some((h) =>
      h.toLowerCase().includes(section.toLowerCase()),
    );

    if (!found) {
      missing.push(section);
    }
  }

  if (missing.length === 0) {
    return {
      name: 'Required sections',
      status: 'pass',
      detail: `All ${REQUIRED_SECTIONS.length} required sections present`,
    };
  }

  return {
    name: 'Required sections',
    status: 'fail',
    detail: `Missing sections: ${missing.join(', ')}`,
  };
}

function checkTokenBudget(content: string): CheckResult {
  const tokens = estimateTokens(content);
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

  if (tokens > 8000) {
    return {
      name: 'Token budget',
      status: 'warn',
      detail: `${wordCount} words ≈ ${tokens} tokens (exceeds 8000 token budget)`,
    };
  }

  return {
    name: 'Token budget',
    status: 'pass',
    detail: `${wordCount} words ≈ ${tokens} tokens (within 8000 token budget)`,
  };
}

function checkNoRuntimeRefs(content: string): CheckResult {
  const lines = content.split('\n');
  const matches: Array<{ line: number; pattern: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    for (const pattern of RUNTIME_PATTERNS) {
      if (pattern.test(line)) {
        matches.push({ line: i + 1, pattern: pattern.source });
      }
    }
  }

  if (matches.length === 0) {
    return {
      name: 'No runtime config references',
      status: 'pass',
      detail: 'No runtime implementation references found',
    };
  }

  const details = matches
    .map((m) => `line ${m.line}: /${m.pattern}/`)
    .join('; ');

  return {
    name: 'No runtime config references',
    status: 'fail',
    detail: `Found runtime references: ${details}`,
  };
}

function checkFileNotEmpty(content: string): CheckResult {
  if (content.trim().length === 0) {
    return {
      name: 'File not empty',
      status: 'fail',
      detail: 'CLAUDE.md is empty',
    };
  }

  return {
    name: 'File not empty',
    status: 'pass',
    detail: `${content.split('\n').length} lines`,
  };
}

function formatStatus(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return green('PASS');
    case 'fail':
      return red('FAIL');
    case 'warn':
      return yellow('WARN');
  }
}

async function main(): Promise<void> {
  console.log(bold('\n📄 Linting CLAUDE.md...\n'));

  const claudePath = join(ROOT, 'CLAUDE.md');
  let content: string;

  try {
    content = await readFile(claudePath, 'utf-8');
  } catch {
    console.log(red('  ✗ CLAUDE.md not found at project root'));
    process.exit(1);
  }

  const results: CheckResult[] = [
    checkFileNotEmpty(content),
    checkRequiredSections(content),
    checkTokenBudget(content),
    checkNoRuntimeRefs(content),
  ];

  let hasFailure = false;

  for (const result of results) {
    const icon =
      result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
    console.log(`  ${formatStatus(result.status)} ${icon} ${result.name}`);
    console.log(`       ${result.detail}`);

    if (result.status === 'fail') hasFailure = true;
  }

  console.log('');

  if (hasFailure) {
    console.log(red('✗ CLAUDE.md lint failed.\n'));
    process.exit(1);
  }

  console.log(green('✓ CLAUDE.md lint passed.\n'));
  process.exit(0);
}

main();
