#!/usr/bin/env bun
import { $ } from 'bun';

interface DepCheck {
  name: string;
  command: string;
  required: boolean;
}

const deps: DepCheck[] = [
  { name: 'bun', command: 'bun --version', required: true },
  { name: 'git', command: 'git --version', required: true },
  { name: 'mprocs', command: 'mprocs --version', required: false },
  { name: 'psql (PostgreSQL)', command: 'psql --version', required: false },
];

async function checkDeps() {
  console.log('Checking dependencies...\n');

  let allRequired = true;

  for (const dep of deps) {
    try {
      const result = await $`sh -c ${dep.command}`.text();
      const version = result.trim().split('\n')[0];
      console.log(`  ✓ ${dep.name}: ${version}`);
    } catch {
      const marker = dep.required ? '✗' : '⚠';
      const level = dep.required ? 'REQUIRED' : 'optional';
      console.log(`  ${marker} ${dep.name}: not found (${level})`);

      if (dep.required) allRequired = false;
    }
  }

  console.log('');

  if (!allRequired) {
    console.error('Some required dependencies are missing.');
    process.exit(1);
  }

  console.log('All required dependencies are available.');
}

checkDeps().catch((err) => {
  console.error('Dependency check failed:', err);
  process.exit(1);
});
