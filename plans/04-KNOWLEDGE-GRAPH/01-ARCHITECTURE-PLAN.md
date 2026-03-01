# 04-KNOWLEDGE-GRAPH / 01 — ARCHITECTURE PLAN

> **Purpose**: Define the complete knowledge graph data model including JSON
> schemas for specs (nodes), edges, and spec documents; the folder/file layout
> within the git-backed repository; ID generation strategy; index files for fast
> lookups; integrity constraints; schema versioning; and migration strategy.
>
> **Phase**: 2 (Core Systems)
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 135+

---

## Table of Contents

1. [Folder & File Layout](#1-folder--file-layout)
2. [ID Generation Strategy](#2-id-generation-strategy)
3. [Spec (Node) Schema](#3-spec-node-schema)
4. [Edge Schema](#4-edge-schema)
5. [Spec Document Schema](#5-spec-document-schema)
6. [Index Files](#6-index-files)
7. [File Naming Conventions](#7-file-naming-conventions)
8. [Graph Integrity Constraints](#8-graph-integrity-constraints)
9. [Schema Versioning](#9-schema-versioning)
10. [Migration Strategy](#10-migration-strategy)
11. [Shared Types & Interfaces](#11-shared-types--interfaces)
12. [Storage Layer Abstraction](#12-storage-layer-abstraction)

---

## 1. Folder & File Layout

### 1.1 Top-Level Repository Structure

- [ ] **KG-ARCH-001**: Define the `knowledge-graph/` root directory structure
  ```
  knowledge-graph/
  ├── specs/                    # All spec nodes
  │   └── {spec-id}/
  │       ├── spec.json         # Core spec data (ID, title, status, version)
  │       ├── content.md        # Rich text content of the spec
  │       └── metadata.json     # Extended metadata (author, dates, tags, permissions, embeddings)
  ├── edges/                    # All edges between specs
  │   └── {edge-id}.json        # Single file per edge
  ├── documents/                # Spec documents (groups of specs)
  │   └── {doc-id}/
  │       └── document.json     # Document metadata and ordered spec list
  ├── indexes/                  # Derived index files for fast lookups
  │   ├── spec-index.json       # ID → path mapping for all specs
  │   ├── edge-index.json       # Adjacency lists and edge lookups
  │   ├── document-index.json   # Document → spec membership
  │   ├── tag-index.json        # Tag → spec ID lists
  │   └── author-index.json     # Author → spec ID lists
  ├── inquiries/                # Agent-flagged issues
  │   └── {inquiry-id}.json
  ├── schema-version.json       # Current schema version for migration
  └── .kg-config.json           # Knowledge graph configuration
  ```
- [ ] **KG-ARCH-002**: Create the `knowledge-graph/` directory in the monorepo root
  - Ensure it is git-tracked
  - Add appropriate `.gitkeep` files for empty directories
  - Add `.gitattributes` for JSON merge strategy hints
- [ ] **KG-ARCH-003**: Create `knowledge-graph/.gitattributes` for JSON handling
  - Set JSON files to use `merge=union` or a custom merge driver
  - Set Markdown files to default text merge
  - Configure diff attributes for JSON (pretty-print diffs)
- [ ] **KG-ARCH-004**: Create `knowledge-graph/.kg-config.json` configuration file
  - Define default schema version
  - Define ID generation strategy setting
  - Define index rebuild interval/trigger settings
  - Define max spec content size limit
  - Define supported edge types list

### 1.2 Spec Directory Layout

- [ ] **KG-ARCH-005**: Define the per-spec directory structure
  - Each spec gets its own directory: `specs/{spec-id}/`
  - Separate files for core data, content, and metadata to minimize merge conflicts
  - Content in Markdown allows rich text without JSON escaping
- [ ] **KG-ARCH-006**: Document the rationale for three-file-per-spec design
  - `spec.json` — rarely conflicts (ID, title, status are seldom edited concurrently)
  - `content.md` — most frequently edited, standard text merge works well
  - `metadata.json` — machine-updated fields (embeddings, dates) separated from human-edited content
- [ ] **KG-ARCH-007**: Define the maximum directory depth for the spec hierarchy
  - Flat structure: `specs/{spec-id}/` (no nesting beyond this)
  - Avoids deep nesting that complicates path resolution
- [ ] **KG-ARCH-008**: Evaluate sharding for large spec counts
  - If >10,000 specs, consider prefix-based sharding: `specs/{first-2-chars}/{spec-id}/`
  - Document the threshold at which sharding activates
  - Ensure index files abstract over the sharding layout

### 1.3 Edge File Layout

- [ ] **KG-ARCH-009**: Define edge storage as individual JSON files
  - Each edge is a single file: `edges/{edge-id}.json`
  - Flat directory (no subdirectories per edge, edges are small)
- [ ] **KG-ARCH-010**: Evaluate edge file sharding for scale
  - If >50,000 edges, consider grouping by source spec: `edges/{source-spec-id}/{edge-id}.json`
  - Document trade-offs (locality vs. directory size)

### 1.4 Document Directory Layout

- [ ] **KG-ARCH-011**: Define the per-document directory structure
  - `documents/{doc-id}/document.json` — document metadata and ordered spec references
  - Documents do NOT duplicate spec content, only reference spec IDs
- [ ] **KG-ARCH-012**: Define document-to-spec relationship as reference-only
  - `document.json` contains an ordered array of spec IDs
  - Spec content lives exclusively in `specs/{spec-id}/`
  - This avoids data duplication and conflict between document-level and spec-level edits

### 1.5 Inquiry Directory Layout

- [ ] **KG-ARCH-013**: Define the inquiry file structure
  - `inquiries/{inquiry-id}.json` — agent-flagged issues for human review
  - Inquiries reference spec IDs, edge IDs, or document IDs
  - Include status field: open, acknowledged, resolved, dismissed

---

## 2. ID Generation Strategy

### 2.1 ID Format Selection

- [ ] **KG-ARCH-014**: Select ID generation library and format
  - Use `nanoid` for all entity IDs (specs, edges, documents, inquiries)
  - Default length: 21 characters (128 bits of entropy)
  - URL-safe alphabet: `A-Za-z0-9_-`
  - Rationale: shorter than UUID, URL-safe, no dashes, sufficient entropy
- [ ] **KG-ARCH-015**: Define ID prefixes for entity type identification
  - Specs: `sp_` prefix → `sp_V1StGXR8_Z5jdHi6B-myT`
  - Edges: `eg_` prefix → `eg_V1StGXR8_Z5jdHi6B-myT`
  - Documents: `dc_` prefix → `dc_V1StGXR8_Z5jdHi6B-myT`
  - Inquiries: `iq_` prefix → `iq_V1StGXR8_Z5jdHi6B-myT`
  - Prefixes enable type identification from ID alone
- [ ] **KG-ARCH-016**: Create ID generation utility module in `shared/`
  - `generateSpecId()` → prefixed nanoid
  - `generateEdgeId()` → prefixed nanoid
  - `generateDocumentId()` → prefixed nanoid
  - `generateInquiryId()` → prefixed nanoid
  - `parseEntityType(id)` → extract type from prefix
  - `validateId(id)` → check format and prefix

### 2.2 ID Uniqueness Guarantees

- [ ] **KG-ARCH-017**: Document uniqueness guarantees and collision probability
  - nanoid 21 chars: ~1 billion IDs needed for 1% collision probability
  - With prefix: collision impossible across entity types
  - Document that IDs are globally unique (no reuse after deletion)
- [ ] **KG-ARCH-018**: Implement ID collision detection during creation
  - Check existing index before writing a new entity
  - Regenerate on collision (astronomically unlikely but handles gracefully)
- [ ] **KG-ARCH-019**: Define ID immutability rule
  - Once assigned, an entity's ID never changes
  - All references use the ID (never file paths, which could change with sharding)

### 2.3 ID Resolution

- [ ] **KG-ARCH-020**: Create ID-to-file-path resolution utility
  - `resolveSpecPath(specId)` → `knowledge-graph/specs/{spec-id}/spec.json`
  - `resolveSpecContentPath(specId)` → `knowledge-graph/specs/{spec-id}/content.md`
  - `resolveSpecMetadataPath(specId)` → `knowledge-graph/specs/{spec-id}/metadata.json`
  - `resolveEdgePath(edgeId)` → `knowledge-graph/edges/{edge-id}.json`
  - `resolveDocumentPath(docId)` → `knowledge-graph/documents/{doc-id}/document.json`
  - `resolveInquiryPath(inquiryId)` → `knowledge-graph/inquiries/{inquiry-id}.json`
- [ ] **KG-ARCH-021**: Implement path resolution that respects sharding configuration
  - If sharding is enabled, resolve through shard prefix
  - Abstract sharding from callers — they only pass IDs

---

## 3. Spec (Node) Schema

### 3.1 Core Spec Schema (`spec.json`)

- [ ] **KG-ARCH-022**: Define `spec.json` JSON schema
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "id": { "type": "string", "pattern": "^sp_[A-Za-z0-9_-]{21}$" },
      "title": { "type": "string", "minLength": 1, "maxLength": 500 },
      "status": { "enum": ["draft", "active", "deprecated", "archived"] },
      "schemaVersion": { "type": "integer", "minimum": 1 },
      "createdAt": { "type": "string", "format": "date-time" },
      "updatedAt": { "type": "string", "format": "date-time" }
    },
    "required": ["id", "title", "status", "schemaVersion", "createdAt", "updatedAt"]
  }
  ```
- [ ] **KG-ARCH-023**: Define spec status lifecycle
  - `draft` → initial creation, not yet reviewed
  - `active` → reviewed and accepted as current knowledge
  - `deprecated` → superseded by another spec but retained for history
  - `archived` → no longer relevant, hidden from default views
  - Document valid transitions: draft→active, active→deprecated, active→archived, deprecated→archived
- [ ] **KG-ARCH-024**: Define spec title constraints
  - Minimum length: 1 character
  - Maximum length: 500 characters
  - Must be non-empty after trimming whitespace
  - No restriction on characters (Unicode supported)
- [ ] **KG-ARCH-025**: Define timestamp format and timezone handling
  - All timestamps in ISO 8601 format with UTC timezone: `2026-02-28T12:00:00.000Z`
  - `createdAt` set once on creation, never modified
  - `updatedAt` set on every modification to any of the spec's files

### 3.2 Content File (`content.md`)

- [ ] **KG-ARCH-026**: Define spec content format as Markdown
  - Standard CommonMark Markdown
  - Support GFM (GitHub Flavored Markdown) extensions: tables, task lists, strikethrough
  - Support fenced code blocks with language hints
  - No frontmatter (metadata is in separate files)
- [ ] **KG-ARCH-027**: Define content size limits
  - Recommended maximum: 100KB per spec content file
  - Hard limit: 1MB (reject on create/update if exceeded)
  - Document rationale: keeps git diffs manageable, encourages spec decomposition
- [ ] **KG-ARCH-028**: Define content linking conventions
  - Internal spec references use format: `[[sp_xxxxx]]` or `[[sp_xxxxx|display text]]`
  - Document references: `[[dc_xxxxx]]`
  - These are parsed by the frontend for navigation, not stored as edges
- [ ] **KG-ARCH-029**: Define content embedding boundary markers (optional)
  - For RAG chunking: `<!-- chunk-break -->` can suggest chunk boundaries
  - Agent can insert these during content analysis
  - Chunker uses these as hints but also applies its own strategy

### 3.3 Metadata Schema (`metadata.json`)

- [ ] **KG-ARCH-030**: Define `metadata.json` JSON schema
  ```json
  {
    "type": "object",
    "properties": {
      "specId": { "type": "string" },
      "author": { "type": "string" },
      "contributors": { "type": "array", "items": { "type": "string" } },
      "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
      "permissions": { "$ref": "#/$defs/permissions" },
      "summary": { "type": "string", "maxLength": 1000 },
      "embedding": { "$ref": "#/$defs/embedding" },
      "documentIds": { "type": "array", "items": { "type": "string" } },
      "custom": { "type": "object" }
    },
    "required": ["specId", "author", "tags", "permissions"]
  }
  ```
- [ ] **KG-ARCH-031**: Define the author and contributors model
  - `author` — user ID of the spec creator (immutable after creation)
  - `contributors` — array of user IDs who have edited the spec
  - Contributors list is appended automatically on each edit by a new user
- [ ] **KG-ARCH-032**: Define the tags schema
  - Tags are lowercase, alphanumeric with hyphens: `^[a-z0-9][a-z0-9-]*$`
  - Maximum tag length: 50 characters
  - Maximum tags per spec: 50
  - Tags are used for filtering, grouping, and RAG metadata
- [ ] **KG-ARCH-033**: Define the permissions schema
  ```json
  {
    "$defs": {
      "permissions": {
        "type": "object",
        "properties": {
          "visibility": { "enum": ["public", "restricted"] },
          "accessList": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "userId": { "type": "string" },
                "level": { "enum": ["full", "summary"] }
              }
            }
          },
          "defaultLevel": { "enum": ["full", "summary"] }
        }
      }
    }
  }
  ```
  - `public` visibility: all users have at least `defaultLevel` access
  - `restricted` visibility: only users in `accessList` have access
  - Anti-siloing: `summary` level always available (never "no access")
- [ ] **KG-ARCH-034**: Define the summary field
  - Auto-generated or human-written summary of the spec (max 1000 chars)
  - Used for summary-level access (users who can't see full content)
  - Agent can auto-generate summaries during spec creation/update
- [ ] **KG-ARCH-035**: Define the embedding schema
  ```json
  {
    "$defs": {
      "embedding": {
        "type": "object",
        "properties": {
          "model": { "type": "string" },
          "vector": { "type": "array", "items": { "type": "number" } },
          "dimensions": { "type": "integer" },
          "generatedAt": { "type": "string", "format": "date-time" },
          "contentHash": { "type": "string" }
        }
      }
    }
  }
  ```
  - `model` — embedding model identifier (e.g., "text-embedding-3-small")
  - `vector` — the embedding vector (stored in metadata for portability)
  - `contentHash` — hash of content when embedding was generated (detect staleness)
- [ ] **KG-ARCH-036**: Define the `documentIds` field
  - Array of document IDs this spec belongs to
  - A spec can belong to multiple documents (many-to-many)
  - Maintained bidirectionally with `document.json` spec lists
- [ ] **KG-ARCH-037**: Define the `custom` metadata field
  - Free-form JSON object for domain-specific metadata
  - Agents can store analysis results, quality scores, or processing flags
  - No schema enforcement on custom fields (flexible extension point)

---

## 4. Edge Schema

### 4.1 Edge JSON Schema

- [ ] **KG-ARCH-038**: Define edge JSON schema (`edges/{edge-id}.json`)
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "pattern": "^eg_[A-Za-z0-9_-]{21}$" },
      "type": { "enum": ["derived-from", "depends-on", "related-to", "contradicts", "supersedes"] },
      "sourceSpecId": { "type": "string", "pattern": "^sp_" },
      "targetSpecId": { "type": "string", "pattern": "^sp_" },
      "metadata": { "$ref": "#/$defs/edgeMetadata" },
      "createdAt": { "type": "string", "format": "date-time" },
      "updatedAt": { "type": "string", "format": "date-time" },
      "createdBy": { "type": "string" },
      "schemaVersion": { "type": "integer", "minimum": 1 }
    },
    "required": ["id", "type", "sourceSpecId", "targetSpecId", "metadata", "createdAt", "updatedAt", "createdBy", "schemaVersion"]
  }
  ```
- [ ] **KG-ARCH-039**: Define the fixed edge taxonomy
  - `derived-from` — target spec was derived from source spec (directional)
  - `depends-on` — source spec depends on target spec (directional)
  - `related-to` — bidirectional topical relationship
  - `contradicts` — source spec contradicts target spec (bidirectional)
  - `supersedes` — source spec supersedes target spec (directional)
  - Document that this taxonomy is fixed and not user-extensible
- [ ] **KG-ARCH-040**: Define edge directionality rules
  - `derived-from`: A derived-from B → A is the derivative, B is the source
  - `depends-on`: A depends-on B → A requires B
  - `related-to`: bidirectional — if A related-to B, then B related-to A (single edge stored)
  - `contradicts`: bidirectional — single edge stored, traversal in both directions
  - `supersedes`: A supersedes B → A is newer, B is older
- [ ] **KG-ARCH-041**: Define self-edge prevention rule
  - `sourceSpecId` must not equal `targetSpecId`
  - Validation enforced on creation and update
- [ ] **KG-ARCH-042**: Define duplicate edge prevention rule
  - No two edges may have the same (type, sourceSpecId, targetSpecId) triple
  - For bidirectional types: also check (type, targetSpecId, sourceSpecId)
  - Validation enforced on creation

### 4.2 Edge Metadata Schema

- [ ] **KG-ARCH-043**: Define the edge metadata schema for agent navigation
  ```json
  {
    "$defs": {
      "edgeMetadata": {
        "type": "object",
        "properties": {
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "rationale": { "type": "string", "maxLength": 2000 },
          "strength": { "enum": ["strong", "moderate", "weak"] },
          "context": { "type": "string", "maxLength": 1000 },
          "agentAnalysis": { "type": "object" },
          "tags": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
  ```
- [ ] **KG-ARCH-044**: Define the `confidence` field semantics
  - 0.0–1.0 scale indicating how confident the agent is about this relationship
  - Agent-created edges start with agent confidence; human-confirmed edges set to 1.0
  - Used for filtering: agents can ignore low-confidence edges during graph crawling
- [ ] **KG-ARCH-045**: Define the `rationale` field
  - Free text explanation of why this edge exists
  - Written by the agent or human who created the edge
  - Displayed in the UI when inspecting an edge
  - Maximum 2000 characters
- [ ] **KG-ARCH-046**: Define the `strength` field semantics
  - `strong` — essential relationship (removing would break logical chain)
  - `moderate` — significant but not critical relationship
  - `weak` — loose association, potentially useful for exploration
  - Used for graph layout weighting and agent traversal prioritization
- [ ] **KG-ARCH-047**: Define the `context` field
  - Short description of the relationship context (max 1000 chars)
  - Example: "Both specs define authentication requirements for the API layer"
  - Distinct from `rationale`: context is about the domain, rationale is about why the edge exists
- [ ] **KG-ARCH-048**: Define the `agentAnalysis` field
  - Free-form JSON for agent-specific navigation metadata
  - Examples: traversal priority scores, topic overlap vectors, semantic distance
  - Not schema-enforced — agents evolve their metadata over time
  - Read by agents during graph crawling for intelligent navigation decisions

---

## 5. Spec Document Schema

### 5.1 Document JSON Schema

- [ ] **KG-ARCH-049**: Define `document.json` JSON schema
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string", "pattern": "^dc_[A-Za-z0-9_-]{21}$" },
      "title": { "type": "string", "minLength": 1, "maxLength": 500 },
      "description": { "type": "string", "maxLength": 2000 },
      "specIds": { "type": "array", "items": { "type": "string", "pattern": "^sp_" } },
      "author": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
      "status": { "enum": ["draft", "published", "archived"] },
      "createdAt": { "type": "string", "format": "date-time" },
      "updatedAt": { "type": "string", "format": "date-time" },
      "schemaVersion": { "type": "integer", "minimum": 1 }
    },
    "required": ["id", "title", "specIds", "author", "status", "createdAt", "updatedAt", "schemaVersion"]
  }
  ```
- [ ] **KG-ARCH-050**: Define the `specIds` array as an ordered list
  - The array order defines the presentation order of specs in the document
  - Specs are referenced by ID (not embedded)
  - A spec may appear in the array at most once per document
- [ ] **KG-ARCH-051**: Define document-spec membership rules
  - A spec can belong to zero or more documents
  - A spec with zero documents is an "orphan" (flagged for agent review)
  - Removing a spec from a document does NOT delete the spec
  - Deleting a document does NOT delete its constituent specs
- [ ] **KG-ARCH-052**: Define document status lifecycle
  - `draft` → being assembled, not yet ready for consumption
  - `published` → complete and ready for reading
  - `archived` → no longer actively maintained
- [ ] **KG-ARCH-053**: Define the `description` field
  - Optional long description of the document's purpose and scope
  - Displayed in document list views and search results
  - Maximum 2000 characters

---

## 6. Index Files

### 6.1 Spec Index

- [ ] **KG-ARCH-054**: Define `indexes/spec-index.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "version": { "type": "integer" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "count": { "type": "integer" },
      "specs": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "status": { "type": "string" },
            "updatedAt": { "type": "string" }
          }
        }
      }
    }
  }
  ```
  - Keys are spec IDs, values are summary info for fast listing
  - Avoids scanning every `specs/*/spec.json` for listing operations
- [ ] **KG-ARCH-055**: Implement spec index builder
  - Scan all `specs/*/spec.json` files
  - Extract ID, title, status, updatedAt
  - Write to `indexes/spec-index.json`
  - Track generation timestamp for staleness detection
- [ ] **KG-ARCH-056**: Define spec index update strategy
  - Incremental: update only changed entries on spec create/update/delete
  - Full rebuild: regenerate from scratch (used for repair or initial build)
  - Index is regenerated if older than the most recent spec modification

### 6.2 Edge Index

- [ ] **KG-ARCH-057**: Define `indexes/edge-index.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "version": { "type": "integer" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "count": { "type": "integer" },
      "adjacency": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "outgoing": { "type": "array", "items": { "$ref": "#/$defs/edgeRef" } },
            "incoming": { "type": "array", "items": { "$ref": "#/$defs/edgeRef" } }
          }
        }
      }
    }
  }
  ```
  - `adjacency` keys are spec IDs
  - Each spec has `outgoing` edges (source = this spec) and `incoming` edges (target = this spec)
  - `edgeRef` includes edge ID, type, and the other spec ID for fast traversal
- [ ] **KG-ARCH-058**: Define `edgeRef` sub-schema
  ```json
  {
    "$defs": {
      "edgeRef": {
        "type": "object",
        "properties": {
          "edgeId": { "type": "string" },
          "type": { "type": "string" },
          "specId": { "type": "string" },
          "strength": { "type": "string" },
          "confidence": { "type": "number" }
        }
      }
    }
  }
  ```
  - Denormalized edge summary for graph traversal without loading full edge files
- [ ] **KG-ARCH-059**: Implement edge index builder
  - Scan all `edges/*.json` files
  - Build bidirectional adjacency lists
  - Include edge type, strength, confidence for filtering during traversal
  - Write to `indexes/edge-index.json`

### 6.3 Document Index

- [ ] **KG-ARCH-060**: Define `indexes/document-index.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "version": { "type": "integer" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "documents": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "status": { "type": "string" },
            "specCount": { "type": "integer" },
            "updatedAt": { "type": "string" }
          }
        }
      },
      "specToDocuments": {
        "type": "object",
        "additionalProperties": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
  ```
  - `documents` — document ID → summary for listing
  - `specToDocuments` — spec ID → array of document IDs (reverse lookup)
- [ ] **KG-ARCH-061**: Implement document index builder
  - Scan all `documents/*/document.json` files
  - Build forward (doc → specs) and reverse (spec → docs) mappings
  - Write to `indexes/document-index.json`

### 6.4 Tag Index

- [ ] **KG-ARCH-062**: Define `indexes/tag-index.json` schema
  ```json
  {
    "type": "object",
    "properties": {
      "version": { "type": "integer" },
      "generatedAt": { "type": "string", "format": "date-time" },
      "tags": {
        "type": "object",
        "additionalProperties": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
  ```
  - Keys are tag names, values are arrays of spec IDs with that tag
- [ ] **KG-ARCH-063**: Implement tag index builder
  - Scan all `specs/*/metadata.json` for `tags` arrays
  - Build inverted index: tag → [spec IDs]
  - Write to `indexes/tag-index.json`

### 6.5 Author Index

- [ ] **KG-ARCH-064**: Define `indexes/author-index.json` schema
  - Keys are user IDs, values are arrays of spec IDs authored/contributed to
  - Separate arrays for `authored` (original author) and `contributed` (editor)
- [ ] **KG-ARCH-065**: Implement author index builder
  - Scan all `specs/*/metadata.json` for `author` and `contributors` fields
  - Build inverted index
  - Write to `indexes/author-index.json`

### 6.6 Index Management

- [ ] **KG-ARCH-066**: Create index manager service
  - Centralized module that coordinates all index operations
  - Methods: `rebuildAll()`, `rebuildIndex(indexName)`, `updateIndex(indexName, change)`
  - Track index health: last rebuild time, entry count, staleness flag
- [ ] **KG-ARCH-067**: Implement index staleness detection
  - Compare index `generatedAt` against most recent entity modification time
  - Mark index as stale if any entity was modified after index generation
  - Trigger incremental update or full rebuild based on staleness scope
- [ ] **KG-ARCH-068**: Implement index locking during rebuild
  - Prevent concurrent index writes
  - Use file-based lock (`indexes/.lock`) or in-memory mutex
  - Read operations proceed from stale index during rebuild
- [ ] **KG-ARCH-069**: Implement index validation
  - Verify index entries match actual files on disk
  - Detect missing entries (files without index records)
  - Detect orphaned entries (index records without files)
  - Report discrepancies for repair

---

## 7. File Naming Conventions

- [ ] **KG-ARCH-070**: Define spec directory naming
  - Directory name equals the spec ID: `specs/sp_V1StGXR8_Z5jdHi6B-myT/`
  - No transformation or sanitization of the ID for the directory name
  - IDs are already URL-safe and filesystem-safe
- [ ] **KG-ARCH-071**: Define edge file naming
  - File name equals the edge ID with `.json` extension: `edges/eg_xxxx.json`
- [ ] **KG-ARCH-072**: Define document directory naming
  - Directory name equals the document ID: `documents/dc_xxxx/`
- [ ] **KG-ARCH-073**: Define inquiry file naming
  - File name equals the inquiry ID with `.json` extension: `inquiries/iq_xxxx.json`
- [ ] **KG-ARCH-074**: Define reserved filenames to avoid
  - Document filenames that conflict with git internals (`.git`, `.gitkeep`)
  - Document platform-specific restrictions (CON, PRN, AUX on Windows)
  - Ensure ID generator cannot produce reserved names (prefix ensures this)

---

## 8. Graph Integrity Constraints

### 8.1 Node Integrity

- [ ] **KG-ARCH-075**: Define spec existence constraints
  - Every spec directory must contain `spec.json`, `content.md`, and `metadata.json`
  - Missing any file makes the spec invalid — integrity check flags it
- [ ] **KG-ARCH-076**: Define spec ID consistency constraints
  - `spec.json.id` must match the directory name
  - `metadata.json.specId` must match `spec.json.id`
  - Mismatch indicates corruption — flag for repair
- [ ] **KG-ARCH-077**: Define spec referential integrity with documents
  - If `metadata.json.documentIds` lists a document ID, that document must exist
  - If `document.json.specIds` lists a spec ID, that spec must exist
  - Bidirectional: both sides must agree on membership

### 8.2 Edge Integrity

- [ ] **KG-ARCH-078**: Define edge referential integrity
  - `edge.sourceSpecId` must reference an existing spec
  - `edge.targetSpecId` must reference an existing spec
  - Edges referencing deleted specs are "dangling" — flag for cleanup
- [ ] **KG-ARCH-079**: Define edge uniqueness constraint
  - No duplicate (type, source, target) triple
  - For bidirectional types: also no (type, target, source) duplicate
- [ ] **KG-ARCH-080**: Define edge self-reference constraint
  - `sourceSpecId !== targetSpecId` — no self-loops
- [ ] **KG-ARCH-081**: Define edge type constraint
  - `type` must be one of the fixed taxonomy values
  - Unknown types are rejected on creation/update

### 8.3 Document Integrity

- [ ] **KG-ARCH-082**: Define document referential integrity
  - All spec IDs in `document.json.specIds` must reference existing specs
  - No duplicate spec IDs within a single document's spec list
- [ ] **KG-ARCH-083**: Define document-spec bidirectional consistency
  - If document D contains spec S, then spec S's `documentIds` must include D
  - Inconsistency detected during integrity checks — auto-repair by reconciling

### 8.4 Index Integrity

- [ ] **KG-ARCH-084**: Define index consistency constraints
  - Index entries must match the actual files on disk
  - Missing index entries: entity exists but index doesn't know about it
  - Orphaned index entries: index references a non-existent entity
  - Both cases flagged during integrity validation
- [ ] **KG-ARCH-085**: Implement full integrity check routine
  - Validate all spec directories (files present, IDs consistent)
  - Validate all edge files (referential integrity)
  - Validate all document files (referential integrity, bidirectional consistency)
  - Validate all index files (match reality)
  - Produce an integrity report with errors, warnings, and auto-fix suggestions
- [ ] **KG-ARCH-086**: Implement auto-repair for common integrity issues
  - Remove dangling edges (referenced spec deleted)
  - Reconcile document-spec bidirectional references
  - Rebuild stale or corrupted indexes
  - Log all auto-repairs for audit trail

---

## 9. Schema Versioning

### 9.1 Version Tracking

- [ ] **KG-ARCH-087**: Define `schema-version.json` at the knowledge graph root
  ```json
  {
    "currentVersion": 1,
    "minimumReaderVersion": 1,
    "lastMigration": null,
    "history": []
  }
  ```
  - `currentVersion` — the schema version all entities should conform to
  - `minimumReaderVersion` — oldest schema version readers must understand
  - `lastMigration` — timestamp and version of the most recent migration run
  - `history` — array of migration records
- [ ] **KG-ARCH-088**: Define schema version in every entity JSON
  - `spec.json.schemaVersion`, `edge.json.schemaVersion`, `document.json.schemaVersion`
  - Allows entities to be at different schema versions during migration
  - Readers must handle entities at older versions gracefully
- [ ] **KG-ARCH-089**: Define version bump strategy
  - Additive changes (new optional fields): minor version bump, no migration needed
  - Breaking changes (renamed fields, removed fields, type changes): major version bump, migration required
  - Document the version history with change descriptions

### 9.2 Version Compatibility

- [ ] **KG-ARCH-090**: Implement forward-compatible reading
  - Readers ignore unknown fields (JSON schema `additionalProperties: true`)
  - Readers apply defaults for missing optional fields
  - Older readers can read newer entities (within `minimumReaderVersion`)
- [ ] **KG-ARCH-091**: Implement schema version validation on read
  - When reading an entity, check its `schemaVersion`
  - If below `minimumReaderVersion`, flag for migration
  - If above current version, warn but attempt to read (forward compatibility)

---

## 10. Migration Strategy

### 10.1 Migration Framework

- [ ] **KG-ARCH-092**: Create migration runner utility
  - Located in `packages/kg-migrations/` or `server/src/knowledge-graph/migrations/`
  - Discovers and runs migration scripts in order
  - Tracks which migrations have been applied
- [ ] **KG-ARCH-093**: Define migration script format
  - Each migration is a TypeScript module with `up()` and `down()` functions
  - `up()` migrates from version N to N+1
  - `down()` rolls back from version N+1 to N
  - Migration receives a context with file read/write utilities
- [ ] **KG-ARCH-094**: Define migration naming convention
  - `001-initial-schema.ts`
  - `002-add-embedding-to-metadata.ts`
  - `003-rename-edge-weight-to-strength.ts`
  - Sequential numbering ensures execution order
- [ ] **KG-ARCH-095**: Implement migration transaction semantics
  - Migrations operate on a temporary copy or use git branching
  - If migration fails partway, roll back all changes
  - Only commit the migrated state after full success
- [ ] **KG-ARCH-096**: Implement migration dry-run mode
  - Report what changes would be made without applying them
  - Show count of entities affected per change
  - Useful for validating migration before production run

### 10.2 Migration Operations

- [ ] **KG-ARCH-097**: Implement entity-level migration
  - Migrate individual JSON files by reading, transforming, and writing back
  - Handle each entity type separately (specs, edges, documents)
  - Update `schemaVersion` field in each migrated entity
- [ ] **KG-ARCH-098**: Implement index rebuild after migration
  - After entity migration, rebuild all index files
  - Verify index consistency after rebuild
- [ ] **KG-ARCH-099**: Implement migration logging
  - Log each entity migrated (ID, from-version, to-version)
  - Log any entities that failed migration with error details
  - Write migration summary to `schema-version.json.history`
- [ ] **KG-ARCH-100**: Implement migration validation
  - After migration, run full integrity check
  - Validate all migrated entities against new schema version
  - Report any entities that don't pass validation

### 10.3 Backup & Recovery

- [ ] **KG-ARCH-101**: Implement pre-migration backup
  - Create a git commit or tag before migration: `pre-migration-v{N}-to-v{N+1}`
  - Enables easy rollback via git if migration causes issues
- [ ] **KG-ARCH-102**: Implement migration rollback
  - `down()` migration scripts for each `up()`
  - Git-based rollback: reset to pre-migration commit
  - Document when each approach is appropriate

---

## 11. Shared Types & Interfaces

### 11.1 TypeScript Type Definitions

- [ ] **KG-ARCH-103**: Create `shared/src/types/knowledge-graph/` directory
- [ ] **KG-ARCH-104**: Define `Spec` TypeScript interface
  ```typescript
  interface Spec {
    id: string;
    title: string;
    status: SpecStatus;
    schemaVersion: number;
    createdAt: string;
    updatedAt: string;
  }
  type SpecStatus = 'draft' | 'active' | 'deprecated' | 'archived';
  ```
- [ ] **KG-ARCH-105**: Define `SpecMetadata` TypeScript interface
  ```typescript
  interface SpecMetadata {
    specId: string;
    author: string;
    contributors: string[];
    tags: string[];
    permissions: SpecPermissions;
    summary?: string;
    embedding?: SpecEmbedding;
    documentIds: string[];
    custom?: Record<string, unknown>;
  }
  ```
- [ ] **KG-ARCH-106**: Define `Edge` TypeScript interface
  ```typescript
  interface Edge {
    id: string;
    type: EdgeType;
    sourceSpecId: string;
    targetSpecId: string;
    metadata: EdgeMetadata;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    schemaVersion: number;
  }
  type EdgeType = 'derived-from' | 'depends-on' | 'related-to' | 'contradicts' | 'supersedes';
  ```
- [ ] **KG-ARCH-107**: Define `EdgeMetadata` TypeScript interface
  ```typescript
  interface EdgeMetadata {
    confidence: number;
    rationale: string;
    strength: EdgeStrength;
    context?: string;
    agentAnalysis?: Record<string, unknown>;
    tags?: string[];
  }
  type EdgeStrength = 'strong' | 'moderate' | 'weak';
  ```
- [ ] **KG-ARCH-108**: Define `SpecDocument` TypeScript interface
  ```typescript
  interface SpecDocument {
    id: string;
    title: string;
    description?: string;
    specIds: string[];
    author: string;
    tags: string[];
    status: DocumentStatus;
    createdAt: string;
    updatedAt: string;
    schemaVersion: number;
  }
  type DocumentStatus = 'draft' | 'published' | 'archived';
  ```
- [ ] **KG-ARCH-109**: Define `Inquiry` TypeScript interface
  ```typescript
  interface Inquiry {
    id: string;
    type: InquiryType;
    targetId: string;
    targetType: 'spec' | 'edge' | 'document';
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    status: InquiryStatus;
    createdBy: string;
    createdAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolution?: string;
  }
  type InquiryType = 'orphan-spec' | 'broken-edge' | 'contradiction' | 'missing-metadata' | 'stale-content' | 'suggested-edge' | 'quality-issue';
  type InquiryStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  ```
- [ ] **KG-ARCH-110**: Define `SpecPermissions` TypeScript interface
  ```typescript
  interface SpecPermissions {
    visibility: 'public' | 'restricted';
    accessList: PermissionEntry[];
    defaultLevel: 'full' | 'summary';
  }
  interface PermissionEntry {
    userId: string;
    level: 'full' | 'summary';
  }
  ```
- [ ] **KG-ARCH-111**: Define `SpecEmbedding` TypeScript interface
  ```typescript
  interface SpecEmbedding {
    model: string;
    vector: number[];
    dimensions: number;
    generatedAt: string;
    contentHash: string;
  }
  ```

### 11.2 Validation Utilities

- [ ] **KG-ARCH-112**: Create Zod schemas mirroring all TypeScript interfaces
  - `specSchema`, `specMetadataSchema`, `edgeSchema`, `edgeMetadataSchema`, `documentSchema`, `inquirySchema`
  - Used for runtime validation on read and write operations
- [ ] **KG-ARCH-113**: Create validation functions for each entity type
  - `validateSpec(data)` → returns validated `Spec` or throws
  - `validateEdge(data)` → returns validated `Edge` or throws
  - `validateDocument(data)` → returns validated `SpecDocument` or throws
  - `validateInquiry(data)` → returns validated `Inquiry` or throws
- [ ] **KG-ARCH-114**: Create partial validation for updates
  - `validateSpecUpdate(partial)` — validate only provided fields
  - `validateEdgeUpdate(partial)` — validate only provided fields
  - Allow partial updates without requiring all required fields

### 11.3 Barrel Exports

- [ ] **KG-ARCH-115**: Create `shared/src/types/knowledge-graph/index.ts` barrel export
  - Export all interfaces, types, enums, and Zod schemas
  - Used by server, client, and MCP tools

---

## 12. Storage Layer Abstraction

### 12.1 Storage Interface

- [ ] **KG-ARCH-116**: Define `KnowledgeGraphStorage` interface
  ```typescript
  interface KnowledgeGraphStorage {
    readSpec(id: string): Promise<Spec>;
    readSpecContent(id: string): Promise<string>;
    readSpecMetadata(id: string): Promise<SpecMetadata>;
    writeSpec(id: string, data: Spec): Promise<void>;
    writeSpecContent(id: string, content: string): Promise<void>;
    writeSpecMetadata(id: string, metadata: SpecMetadata): Promise<void>;
    deleteSpec(id: string): Promise<void>;
    specExists(id: string): Promise<boolean>;
    readEdge(id: string): Promise<Edge>;
    writeEdge(id: string, data: Edge): Promise<void>;
    deleteEdge(id: string): Promise<void>;
    readDocument(id: string): Promise<SpecDocument>;
    writeDocument(id: string, data: SpecDocument): Promise<void>;
    deleteDocument(id: string): Promise<void>;
    readIndex(name: string): Promise<unknown>;
    writeIndex(name: string, data: unknown): Promise<void>;
    listSpecs(): Promise<string[]>;
    listEdges(): Promise<string[]>;
    listDocuments(): Promise<string[]>;
  }
  ```
- [ ] **KG-ARCH-117**: Implement `FileSystemStorage` class
  - Concrete implementation reading/writing JSON files and Markdown
  - Uses `resolveSpecPath()` and related utilities for path resolution
  - Handles JSON parsing/serialization with error handling
  - Handles atomic writes (write to temp file, then rename)
- [ ] **KG-ARCH-118**: Implement atomic file writes
  - Write to `{filename}.tmp` first
  - Rename `{filename}.tmp` to `{filename}` (atomic on most filesystems)
  - Prevents partial writes from corrupting data
- [ ] **KG-ARCH-119**: Implement file read with validation
  - Read JSON, parse, validate against Zod schema
  - Return typed result or throw descriptive error
  - Handle file not found, parse errors, and validation errors distinctly

### 12.2 Storage Configuration

- [ ] **KG-ARCH-120**: Create storage configuration module
  - Base path for knowledge graph directory
  - Whether sharding is enabled
  - Shard threshold settings
  - Index auto-rebuild settings
- [ ] **KG-ARCH-121**: Implement storage initialization
  - Verify directory structure exists on startup
  - Create missing directories
  - Validate `schema-version.json` exists and is current
  - Run pending migrations if needed

### 12.3 Concurrency & Locking

- [ ] **KG-ARCH-122**: Define concurrency model for file access
  - Single-writer, multiple-reader model
  - Writes to the same entity serialized (queue or lock)
  - Reads always serve the latest committed version
- [ ] **KG-ARCH-123**: Implement file-level locking for writes
  - Lock file: `specs/{id}/.lock` during writes
  - Lock timeout: 30 seconds (prevent deadlocks)
  - Queue concurrent writes to the same entity
- [ ] **KG-ARCH-124**: Implement optimistic concurrency control
  - Include `updatedAt` in write operations
  - Compare `updatedAt` before writing; reject if stale
  - Return conflict error with current version for client retry

### 12.4 Error Handling

- [ ] **KG-ARCH-125**: Define storage error types
  - `EntityNotFoundError` — requested entity doesn't exist
  - `EntityAlreadyExistsError` — creating with duplicate ID
  - `ValidationError` — data doesn't match schema
  - `ConcurrencyConflictError` — optimistic lock violation
  - `StorageIOError` — filesystem read/write failure
  - `IntegrityError` — data integrity constraint violation
- [ ] **KG-ARCH-126**: Implement error wrapping and context
  - All storage errors include entity type, ID, and operation
  - Wrap filesystem errors with context (path, operation)
  - Include actionable recovery suggestions in error messages

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Folder & File Layout | 13 (KG-ARCH-001 through KG-ARCH-013) |
| 2. ID Generation Strategy | 8 (KG-ARCH-014 through KG-ARCH-021) |
| 3. Spec (Node) Schema | 16 (KG-ARCH-022 through KG-ARCH-037) |
| 4. Edge Schema | 11 (KG-ARCH-038 through KG-ARCH-048) |
| 5. Spec Document Schema | 5 (KG-ARCH-049 through KG-ARCH-053) |
| 6. Index Files | 16 (KG-ARCH-054 through KG-ARCH-069) |
| 7. File Naming Conventions | 5 (KG-ARCH-070 through KG-ARCH-074) |
| 8. Graph Integrity Constraints | 12 (KG-ARCH-075 through KG-ARCH-086) |
| 9. Schema Versioning | 5 (KG-ARCH-087 through KG-ARCH-091) |
| 10. Migration Strategy | 11 (KG-ARCH-092 through KG-ARCH-102) |
| 11. Shared Types & Interfaces | 14 (KG-ARCH-103 through KG-ARCH-115, Note: 103-115 = 13 items) |
| 12. Storage Layer Abstraction | 11 (KG-ARCH-116 through KG-ARCH-126) |
| **TOTAL** | **126** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` — needs schemas, storage interface, index system
- `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md` — needs file layout, entity schemas
- `05-RAG-LAYER/PLAN.md` — needs spec schema (embedding field), metadata structure
- `03-SERVER/05-GIT-INTEGRATION-PLAN.md` — needs file layout, commit conventions
- `02-FRONTEND/06-SPEC-EDITOR-PLAN.md` — needs spec/document schemas
- `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` — needs node/edge schemas
- `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` — needs storage interface, entity schemas

### Definition of Done

This plan is complete when:
- [ ] All JSON schemas are defined and documented
- [ ] Folder structure is created in the monorepo
- [ ] ID generation utilities are implemented and tested
- [ ] All TypeScript interfaces and Zod schemas are in `shared/`
- [ ] Storage layer abstraction is implemented with FileSystem backend
- [ ] Index builders are implemented for all index types
- [ ] Integrity check routine validates the full graph
- [ ] Schema versioning and migration framework are operational
- [ ] At least one migration script demonstrates the pattern
- [ ] All integrity constraints are enforced on write operations
