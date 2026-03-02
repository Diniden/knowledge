#!/usr/bin/env bun
/**
 * Remove build artifacts, node_modules, coverage reports.
 */
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const root = import.meta.dir + '/..';

const dirs = ['dist', 'build', 'node_modules', 'coverage', '.nyc_output'];

const packages = [
  'shared',
  'server',
  'client',
  'packages/mcp-servers',
  'packages/claude-code-wrapper',
];

for (const pkg of packages) {
  const pkgPath = join(root, pkg);
  if (!existsSync(pkgPath)) continue;
  for (const d of dirs) {
    const target = join(pkgPath, d);
    if (existsSync(target)) {
      rmSync(target, { recursive: true });
      console.log(`Removed ${pkg}/${d}`);
    }
  }
}

// Root node_modules and dist
for (const d of ['node_modules', 'dist']) {
  const target = join(root, d);
  if (existsSync(target)) {
    rmSync(target, { recursive: true });
    console.log(`Removed ${d}`);
  }
}

// tsbuildinfo
import { readdirSync } from 'fs';
function findTsBuildInfo(dir: string) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (
      e.isDirectory() &&
      !e.name.startsWith('.') &&
      e.name !== 'node_modules'
    ) {
      findTsBuildInfo(p);
    } else if (e.name.endsWith('.tsbuildinfo')) {
      rmSync(p);
      console.log(`Removed ${p.replace(root, '')}`);
    }
  }
}
findTsBuildInfo(root);

console.log('Clean complete.');
