import { readFileSync, existsSync } from 'fs';

function parseEnvFile(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const content = readFileSync(path, 'utf-8');
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        keys.add(trimmed.slice(0, eqIdx).trim());
      }
    }
  }
  return keys;
}

async function main() {
  console.info('Environment Variable Validation\n');

  const exampleKeys = parseEnvFile('.env.example');
  const envKeys = parseEnvFile('.env');

  if (envKeys.size === 0) {
    console.error('  .env file not found. Run: cp .env.example .env');
    process.exit(1);
  }

  const missing = [...exampleKeys].filter((k) => !envKeys.has(k));
  const extra = [...envKeys].filter((k) => !exampleKeys.has(k));

  if (missing.length > 0) {
    console.warn('  Missing in .env (present in .env.example):');
    for (const k of missing) console.warn(`    - ${k}`);
  }

  if (extra.length > 0) {
    console.info('  Extra in .env (not in .env.example):');
    for (const k of extra) console.info(`    + ${k}`);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.info('  .env matches .env.example perfectly.');
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

main();
