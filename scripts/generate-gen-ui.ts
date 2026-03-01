#!/usr/bin/env bun
/**
 * Scaffolds a new generative UI project in client/gen/{user}/{project}/.
 * Usage: bun run scripts/generate-gen-ui.ts --user username --project project-name
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');
const GEN_DIR = resolve(ROOT, 'client/gen');

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

const user = getArg('--user');
const project = getArg('--project');

if (!user || !project) {
  console.error('Usage: bun run scripts/generate-gen-ui.ts --user <username> --project <project-name>');
  process.exit(1);
}

const targetDir = resolve(GEN_DIR, user, project);

const packageJson = JSON.stringify({
  name: `@kg-gen/${user}-${project}`,
  private: true,
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  },
  dependencies: {
    react: '^18.3.0',
    'react-dom': '^18.3.0',
  },
  devDependencies: {
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
    '@vitejs/plugin-react': '^4.3.0',
    typescript: '^5.4.0',
    vite: '^5.3.0',
  },
}, null, 2);

const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Single bundle for iframe loading
        inlineDynamicImports: true,
      },
    },
  },
});
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const mainTsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(<StrictMode><App /></StrictMode>);
`;

const appTsx = `export function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>${project}</h1>
      <p>This generative UI was created by an agent for user: ${user}</p>
    </div>
  );
}
`;

async function main(): Promise<void> {
  try {
    await access(targetDir);
    console.error(`Gen UI project already exists: ${targetDir}`);
    process.exit(1);
  } catch {
    // Good — doesn't exist
  }

  await mkdir(resolve(targetDir, 'src'), { recursive: true });
  await writeFile(resolve(targetDir, 'package.json'), packageJson);
  await writeFile(resolve(targetDir, 'vite.config.ts'), viteConfig);
  await writeFile(resolve(targetDir, 'index.html'), indexHtml);
  await writeFile(resolve(targetDir, 'src/main.tsx'), mainTsx);
  await writeFile(resolve(targetDir, 'src/App.tsx'), appTsx);

  console.info(`\n\x1b[32m✓ Generated gen UI: ${user}/${project}\x1b[0m`);
  console.info(`  ${targetDir.replace(ROOT, '.')}/\n`);
  console.info('Next steps:');
  console.info(`  cd client/gen/${user}/${project}`);
  console.info(`  bun install && bun dev\n`);
}

main().catch((err: unknown) => {
  console.error('Failed to generate gen UI:', err);
  process.exit(1);
});
