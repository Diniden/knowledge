# Generative UI Projects

This directory contains agent-generated UI projects. Each project lives under `{user}/{project}/` and is a self-contained Vite application.

## Directory Convention

```
client/gen/
└── {username}/
    └── {project-name}/
        ├── package.json
        ├── vite.config.ts
        ├── index.html
        ├── src/
        │   └── main.tsx
        └── dist/           ← gitignored build output
```

## How Gen UIs are Loaded

Generative UI projects are loaded by the main platform UI via sandboxed `<iframe>` elements. The iframe src points to the built `dist/index.html` of the project, served by the backend at `/api/gen/{user}/{project}/`.

Communication between the host and the iframe occurs via `postMessage` with a defined protocol:

- Host → iframe: `{ type: 'kg:context', payload: AgentContext }`
- iframe → Host: `{ type: 'kg:action', payload: Action }`

## Security

- All iframes use `sandbox="allow-scripts allow-same-origin"` with strict CSP
- No cross-origin resource access is allowed
- Each project has isolated `node_modules` and cannot access host state directly

## Creating a New Gen UI Project

Use the scaffold script:

```bash
bun run scripts/generate-gen-ui.ts --user <username> --project <project-name>
```

## Contents

Contents are **git-tracked** so they can be versioned alongside the knowledge graph. All code in this directory is agent-generated and should be reviewed before merging to main.
