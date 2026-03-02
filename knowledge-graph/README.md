# Knowledge Graph Data Store

This directory is a git-backed file-based knowledge graph. It stores all spec data,
edge relationships, and document groupings as JSON files versioned with git.

## Directory Structure

```
knowledge-graph/
├── specs/                    # All spec nodes
│   └── {documentId}/
│       └── {specId}.json     # One JSON file per spec
├── edges/                    # All edges between specs
│   └── {edgeId}.json         # One JSON file per edge
├── documents/                # Spec documents (groups of specs)
│   └── {documentId}.json     # One JSON file per document
├── meta/                     # Derived index files (git-tracked cache)
│   ├── index.json            # Spec ID → file path mapping
│   ├── adjacency.json        # Spec ID → outgoing/incoming edge refs
│   └── documents.json        # Array of all document IDs
└── README.md
```

## Spec JSON Schema

Specs are stored at `specs/{documentId}/{specId}.json`. Each file contains:

```json
{
  "id": "spec_abc123def456",
  "title": "Authentication Flow",
  "content": "# Authentication\n\nThe system uses JWT tokens...",
  "authorId": "user_001",
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T14:30:00.000Z",
  "version": 3,
  "commitHash": "a1b2c3d",
  "tags": ["auth", "security", "api"],
  "permissionLevel": "FULL_ACCESS",
  "summary": "JWT-based authentication for the REST API",
  "documentId": "doc_xyz789",
  "mediaAssociations": []
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (prefixed `spec_`) |
| `title` | string | Human-readable title |
| `content` | string | Full markdown content |
| `authorId` | string | Creator's user ID |
| `createdAt` | string | ISO 8601 creation timestamp |
| `updatedAt` | string | ISO 8601 last-modified timestamp |
| `version` | number | Monotonically increasing version |
| `commitHash` | string | Git commit hash at last write |
| `tags` | string[] | Categorization tags |
| `permissionLevel` | string | `FULL_ACCESS` or `SUMMARY_ACCESS` |
| `summary` | string? | Optional short summary |
| `documentId` | string | Parent document ID |
| `mediaAssociations` | MediaRef[] | Linked media references |

## Edge JSON Schema

Edges are stored at `edges/{edgeId}.json`. Each file represents a relationship between two specs:

```json
{
  "id": "edge_abc123def456",
  "sourceSpecId": "spec_aaa111",
  "targetSpecId": "spec_bbb222",
  "type": "DEPENDS_ON",
  "metadata": {
    "description": "Auth flow requires the user model spec",
    "weight": 0.9,
    "tags": ["critical-path"]
  },
  "createdAt": "2026-03-01T12:00:00.000Z",
  "createdBy": "user_001",
  "commitHash": "a1b2c3d"
}
```

### Edge Types

| Type | Directionality | Description |
|------|---------------|-------------|
| `DERIVED_FROM` | Directional | Source was derived from target |
| `DEPENDS_ON` | Directional | Source depends on target |
| `RELATED_TO` | Bidirectional | Topical relationship |
| `CONTRADICTS` | Bidirectional | Source contradicts target |
| `SUPERSEDES` | Directional | Source supersedes target |

### Edge Metadata

The `metadata` object is free-form but commonly includes:

| Field | Type | Description |
|-------|------|-------------|
| `description` | string? | Why this edge exists |
| `weight` | number? | Relationship strength (0-1) |
| `tags` | string[]? | Edge-level tags |

## Document JSON Schema

Documents are stored at `documents/{documentId}.json`. They group specs into ordered collections:

```json
{
  "id": "doc_xyz789",
  "title": "API Design Specs",
  "description": "All specifications related to the REST API design",
  "specIds": ["spec_aaa111", "spec_bbb222", "spec_ccc333"],
  "authorId": "user_001",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-01T15:00:00.000Z",
  "commitHash": "a1b2c3d"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (prefixed `doc_`) |
| `title` | string | Document title |
| `description` | string | Purpose and scope |
| `specIds` | string[] | Ordered list of spec IDs |
| `authorId` | string | Creator's user ID |
| `createdAt` | string | ISO 8601 creation timestamp |
| `updatedAt` | string | ISO 8601 last-modified timestamp |
| `commitHash` | string | Git commit hash at last write |

## Meta Files

The `meta/` directory contains derived index files that accelerate lookups.
These files are rebuilt by the server on startup and after write operations.

### `meta/index.json`

Maps spec IDs to their relative file paths within the knowledge-graph directory:

```json
{
  "spec_abc123": "specs/doc_1/spec_abc123.json",
  "spec_def456": "specs/doc_1/spec_def456.json"
}
```

### `meta/adjacency.json`

Adjacency list mapping each spec ID to its outgoing and incoming edge references:

```json
{
  "spec_abc123": {
    "outgoing": [
      { "edgeId": "edge_1", "targetSpecId": "spec_def456", "type": "DEPENDS_ON" }
    ],
    "incoming": [
      { "edgeId": "edge_2", "sourceSpecId": "spec_ghi789", "type": "DERIVED_FROM" }
    ]
  }
}
```

### `meta/documents.json`

Simple array of all document IDs:

```json
["doc_1", "doc_2", "doc_3"]
```

## Git Versioning Strategy

All changes to the knowledge graph are committed to git automatically by the server:

- **Atomic writes**: Files are written to `.tmp` first, then renamed to prevent corruption
- **Version tracking**: Each spec has a `version` number incremented on every update
- **Commit hashes**: The `commitHash` field records which git commit last modified the entity
- **History**: Full history of every spec, edge, and document is preserved in git
- **Branching**: Users can work on branches and merge knowledge graph changes
- **Conflict resolution**: JSON files use standard git merge; the server detects and surfaces conflicts via the inquiry queue

## ID Generation

All entity IDs use nanoid with type-specific prefixes:

| Entity | Prefix | Example |
|--------|--------|---------|
| Spec | `spec_` | `spec_V1StGXR8_Z5jdHi` |
| Edge | `edge_` | `edge_V1StGXR8_Z5jdHi` |
| Document | `doc_` | `doc_V1StGXR8_Z5jdHi` |
