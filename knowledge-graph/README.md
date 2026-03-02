# Knowledge Graph Data

Specs, documents, and edges are stored here as JSON files, git-tracked.

## Directory Structure

- **specs/** — Individual spec JSON files (`{specId}.json`)
- **documents/** — Spec document groupings (`{documentId}.json`)
- **edges/** — Edge definition files (`{edgeId}.json`)
- **meta/** — Graph metadata, indexes, caches

## Spec JSON Schema

```json
{
  "id": "string",
  "title": "string",
  "content": "string (markdown)",
  "authorId": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "version": 1,
  "commitHash": "string",
  "tags": ["string"],
  "permissionLevel": "FULL_ACCESS | SUMMARY_ACCESS",
  "documentId": "string",
  "mediaAssociations": []
}
```

## Edge JSON Schema

```json
{
  "id": "string",
  "sourceSpecId": "string",
  "targetSpecId": "string",
  "type": "DERIVED_FROM | DEPENDS_ON | RELATED_TO | CONTRADICTS | SUPERSEDES",
  "metadata": {},
  "createdAt": "ISO 8601",
  "createdBy": "string",
  "commitHash": "string"
}
```

## Versioning

This directory is git-tracked. Spec-level versioning associates each change with a commit hash.
