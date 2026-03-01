#!/usr/bin/env bun
/**
 * Compares .env against .env.example and reports missing/extra variables.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');

function parseEnvFile(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      keys.add(trimmed.slice(0, eqIdx).trim());
    }
  }
  return keys;
}

async function main(): Promise<void> {
  const exampleContent = await readFile(resolve(ROOT, '.env.example'), 'utf-8');
  let envContent: string;
  try {
    envContent = await readFile(resolve(ROOT, '.env'), 'utf-8');
  } catch {
    console.error('\x1b[31m✗ .env not found. Run: cp .env.example .env\x1b[0m');
    process.exit(1);
  }

  const exampleKeys = parseEnvFile(exampleContent);
  const envKeys = parseEnvFile(envContent);

  const missing = [...exampleKeys].filter(k => !envKeys.has(k));
  const extra = [...envKeys].filter(k => !exampleKeys.has(k));

  if (missing.length > 0) {
    console.warn('\x1b[33mMissing variables (defined in .env.example but not in .env):\x1b[0m');
    for (const key of missing) {
      console.warn(`  - ${key}`);
    }
  }

  if (extra.length > 0) {
    console.info('\x1b[36mExtra variables (in .env but not in .env.example):\x1b[0m');
    for (const key of extra) {
      console.info(`  + ${key}`);
    }
  }

  if (missing.length === 0 && extra.length === 0) {
    console.info('\x1b[32m✓ .env is in sync with .env.example\x1b[0m');
  } else if (missing.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
