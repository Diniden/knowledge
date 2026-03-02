# Generative UI Projects

Agent-generated UI projects are stored here under `{user}/{project}/`.

## Structure

```
gen/
├── {username}/
│   └── {project-name}/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── src/
│       │   └── main.tsx
│       └── dist/          (build output)
```

## Loading

Gen UIs are loaded via iframe + ESM. The host application serves the built `dist/` output in a sandboxed iframe for security isolation.

## Version Control

Contents are git-tracked. Agent-generated code is committed alongside spec changes.
