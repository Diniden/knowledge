#!/usr/bin/env bun
/**
 * Scaffolds a new React component with BEM SCSS.
 * Usage: bun run scripts/generate-component.ts --name MyComponent [--dir path/relative/to/components]
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');
const COMPONENTS_DIR = resolve(ROOT, 'client/ui/src/components');

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

const name = getArg('--name');
const dir = getArg('--dir') ?? '';

if (!name) {
  console.error('Usage: bun run scripts/generate-component.ts --name ComponentName [--dir subdirectory]');
  process.exit(1);
}

if (!/^[A-Z][a-zA-Z0-9]+$/.test(name)) {
  console.error('Component name must be PascalCase (e.g., SpecEditor, ChatPanel)');
  process.exit(1);
}

const targetDir = resolve(COMPONENTS_DIR, dir, name);

const tsxContent = `import './${name}.scss';

interface ${name}Props {
  className?: string;
}

export function ${name}({ className = '' }: ${name}Props) {
  return (
    <div className={\`${name} \${className}\`.trim()}>
      {/* ${name} content */}
    </div>
  );
}
`;

const scssContent = `@use '../../styles/variables' as v;
@use '../../styles/mixins' as m;

.${name} {
  // Block styles

  // &__Element {
  //   // Element styles
  // }

  // &--modifier {
  //   // Modifier styles
  // }
}
`;

const testContent = `import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
    expect(document.querySelector('.${name}')).toBeTruthy();
  });
});
`;

async function main(): Promise<void> {
  try {
    await access(targetDir);
    console.error(`Component directory already exists: ${targetDir}`);
    process.exit(1);
  } catch {
    // Directory doesn't exist — proceed
  }

  await mkdir(targetDir, { recursive: true });
  await writeFile(resolve(targetDir, `${name}.tsx`), tsxContent);
  await writeFile(resolve(targetDir, `${name}.scss`), scssContent);
  await writeFile(resolve(targetDir, `${name}.test.tsx`), testContent);

  console.info(`\n\x1b[32m✓ Generated component: ${name}\x1b[0m`);
  console.info(`  ${targetDir.replace(ROOT, '.')}/`);
  console.info(`    ${name}.tsx`);
  console.info(`    ${name}.scss`);
  console.info(`    ${name}.test.tsx\n`);
}

main().catch((err: unknown) => {
  console.error('Failed to generate component:', err);
  process.exit(1);
});
