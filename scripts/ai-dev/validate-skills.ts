#!/usr/bin/env bun
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..', '..');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface SkillIssue {
  file: string;
  message: string;
  severity: 'error' | 'warning';
}

const CLAUDE_SKILL_SECTIONS = [
  { pattern: /^#\s+/m, name: 'header (H1 title)' },
  {
    pattern: /prerequisites|when.to.use/i,
    name: 'prerequisites / when-to-use',
  },
  {
    pattern: /steps|procedure|workflow|instructions/i,
    name: 'steps / procedure',
  },
  {
    pattern: /validation|verification|verify|check/i,
    name: 'validation / verification',
  },
];

const CURSOR_SKILL_SECTIONS = [
  { pattern: /^#\s+/m, name: 'header (H1 title)' },
  {
    pattern: /prerequisites|when.to.use|trigger/i,
    name: 'prerequisites / when-to-use',
  },
  {
    pattern: /steps|procedure|workflow|instructions/i,
    name: 'steps / procedure',
  },
  {
    pattern: /validation|verification|verify|check|output/i,
    name: 'validation / verification',
  },
];

function checkSections(
  content: string,
  filePath: string,
  sections: Array<{ pattern: RegExp; name: string }>,
): SkillIssue[] {
  const issues: SkillIssue[] = [];
  const relPath = relative(ROOT, filePath);

  for (const section of sections) {
    if (!section.pattern.test(content)) {
      issues.push({
        file: relPath,
        message: `Missing section: ${section.name}`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

function extractFileReferences(content: string): string[] {
  const refs: string[] = [];

  const backtickRefs = content.matchAll(
    /`((?:skill-[\w-]+\.md|[\w/-]+\/SKILL\.md))`/g,
  );
  for (const match of backtickRefs) {
    if (match[1]) refs.push(match[1]);
  }

  const linkRefs = content.matchAll(
    /\[.*?\]\(((?:skill-[\w-]+\.md|[\w/-]+\/SKILL\.md))\)/g,
  );
  for (const match of linkRefs) {
    if (match[1]) refs.push(match[1]);
  }

  return refs;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function validateCrossReferences(
  content: string,
  filePath: string,
): Promise<SkillIssue[]> {
  const issues: SkillIssue[] = [];
  const relPath = relative(ROOT, filePath);
  const refs = extractFileReferences(content);

  for (const ref of refs) {
    const possiblePaths = [
      join(ROOT, ref),
      join(ROOT, '.claude', ref),
      join(ROOT, '.cursor', 'skills', ref),
    ];

    const found = await Promise.all(possiblePaths.map(fileExists));

    if (!found.some(Boolean)) {
      issues.push({
        file: relPath,
        message: `Cross-reference "${ref}" does not resolve to an existing file`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

async function collectClaudeSkills(): Promise<string[]> {
  const entries = await readdir(ROOT);
  return entries
    .filter((e) => e.startsWith('skill-') && e.endsWith('.md'))
    .map((e) => join(ROOT, e));
}

async function collectCursorSkills(): Promise<string[]> {
  const skillsDir = join(ROOT, '.cursor', 'skills');
  const results: string[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFile = join(skillsDir, entry.name, 'SKILL.md');

        if (await fileExists(skillFile)) {
          results.push(skillFile);
        }
      }
    }
  } catch {
    // .cursor/skills/ may not exist
  }

  return results;
}

async function main(): Promise<void> {
  console.log(bold('\n📚 Validating skill files...\n'));

  let totalErrors = 0;
  let totalWarnings = 0;

  const claudeSkills = await collectClaudeSkills();
  const cursorSkills = await collectCursorSkills();

  if (claudeSkills.length === 0 && cursorSkills.length === 0) {
    console.log(yellow('  ⚠ No skill files found'));
    process.exit(0);
  }

  if (claudeSkills.length > 0) {
    console.log(`  Claude Code skills (${claudeSkills.length}):\n`);

    for (const skillPath of claudeSkills) {
      const content = await readFile(skillPath, 'utf-8');
      const relPath = relative(ROOT, skillPath);
      const sectionIssues = checkSections(
        content,
        skillPath,
        CLAUDE_SKILL_SECTIONS,
      );
      const refIssues = await validateCrossReferences(content, skillPath);
      const allIssues = [...sectionIssues, ...refIssues];

      if (allIssues.length === 0) {
        console.log(`    ${green('✓')} ${relPath}`);
      } else {
        for (const issue of allIssues) {
          const icon = issue.severity === 'error' ? red('✗') : yellow('⚠');
          console.log(`    ${icon} ${relPath}: ${issue.message}`);

          if (issue.severity === 'error') totalErrors++;
          else totalWarnings++;
        }
      }
    }

    console.log('');
  }

  if (cursorSkills.length > 0) {
    console.log(`  Cursor skills (${cursorSkills.length}):\n`);

    for (const skillPath of cursorSkills) {
      const content = await readFile(skillPath, 'utf-8');
      const relPath = relative(ROOT, skillPath);
      const sectionIssues = checkSections(
        content,
        skillPath,
        CURSOR_SKILL_SECTIONS,
      );
      const refIssues = await validateCrossReferences(content, skillPath);
      const allIssues = [...sectionIssues, ...refIssues];

      if (allIssues.length === 0) {
        console.log(`    ${green('✓')} ${relPath}`);
      } else {
        for (const issue of allIssues) {
          const icon = issue.severity === 'error' ? red('✗') : yellow('⚠');
          console.log(`    ${icon} ${relPath}: ${issue.message}`);

          if (issue.severity === 'error') totalErrors++;
          else totalWarnings++;
        }
      }
    }

    console.log('');
  }

  if (totalErrors > 0) {
    console.log(
      red(`✗ ${totalErrors} error(s), ${totalWarnings} warning(s)\n`),
    );
    process.exit(1);
  }

  if (totalWarnings > 0) {
    console.log(yellow(`⚠ ${totalWarnings} warning(s), no errors\n`));
    process.exit(0);
  }

  console.log(green('✓ All skill files valid.\n'));
  process.exit(0);
}

main();
