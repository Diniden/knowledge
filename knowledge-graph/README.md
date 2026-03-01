# Knowledge Graph Data

This directory stores the knowledge graph as JSON files in a structured folder layout. All contents are **git-tracked** and versioned at the spec level.

## Directory Structure

```
knowledge-graph/
├── specs/          # Individual spec JSON files — one per spec
├── documents/      # Spec document grouping files
├── edges/          # Edge definition files — one per edge
└── meta/           # Index files, caches, and metadata
```

## Spec JSON Schema

```json
{
  "id": "spec_<uuid>",
  "title": "string",
  "content": "string (markdown)",
  "authorId": "user_<uuid>",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "version": 1,
  "commitHash": "git commit hash",
  "tags": ["string"],
  "permissionLevel": "FULL_ACCESS | SUMMARY_ACCESS",
  "summary": "string (optional, shown when SUMMARY_ACCESS)",
  "documentId": "doc_<uuid>",
  "mediaAssociations": []
}
```

## Edge JSON Schema

```json
{
  "id": "edge_<uuid>",
  "sourceSpecId": "spec_<uuid>",
  "targetSpecId": "spec_<uuid>",
  "type": "DERIVED_FROM | DEPENDS_ON | RELATED_TO | CONTRADICTS | SUPERSEDES",
  "metadata": {},
  "createdAt": "ISO 8601",
  "createdBy": "user_<uuid> | agent",
  "commitHash": "git commit hash"
}
```

## Edge Types

| Type | Description |
|------|-------------|
| `DERIVED_FROM` | This spec was derived from or inspired by the target |
| `DEPENDS_ON` | This spec has a hard dependency on the target being true |
| `RELATED_TO` | Semantically related — no strong directional dependency |
| `CONTRADICTS` | This spec conflicts with the target |
| `SUPERSEDES` | This spec replaces the target |

## Spec Document JSON Schema

```json
{
  "id": "doc_<uuid>",
  "title": "string",
  "description": "string",
  "specIds": ["spec_<uuid>"],
  "authorId": "user_<uuid>",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "commitHash": "git commit hash"
}
```

## Git Versioning Strategy

- Each spec, document, and edge file is committed separately when modified
- Commit messages follow the format: `spec(update): <spec-id> — <title>`
- The `commitHash` field in each JSON file references the commit that last modified it
- Reverting a spec means resetting that file to a previous commit's version
- Merge conflicts in spec files are resolved using the `union` merge driver (see `.gitattributes`)

## Important Notes

- Never manually edit files in this directory — use the application or API
- The `meta/` directory contains auto-generated index files — do not edit them
- Deleted specs are moved to `meta/archive/` rather than removed (for history)
