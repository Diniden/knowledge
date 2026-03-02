/**
 * Spec CRUD MCP tools — create, read, update, delete specs and documents.
 */

import type { ApiClient } from './api-client.js';
import { ToolError, formatToolResult } from '../mcp-error.js';

export const SPEC_TOOL_DEFINITIONS = [
  {
    name: 'spec_create',
    description:
      'Create a new spec in the knowledge graph. Returns the created spec with its generated ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Spec title (1-500 chars)',
        },
        content: {
          type: 'string',
          description: 'Spec content in markdown',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
        status: {
          type: 'string',
          enum: ['draft', 'active'],
          description: 'Initial status (default: draft)',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the spec (max 1000 chars)',
        },
        documentId: {
          type: 'string',
          description: 'Optional document to add the spec to',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'spec_update',
    description:
      'Update an existing spec. Only provided fields are changed (partial update).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to update',
        },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags (replaces existing)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'deprecated', 'archived'],
          description: 'New status',
        },
        summary: { type: 'string', description: 'New summary' },
      },
      required: ['specId'],
    },
  },
  {
    name: 'spec_delete',
    description:
      'Delete a spec and optionally cascade-delete all connected edges. Returns deletion summary.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to delete',
        },
        cascadeEdges: {
          type: 'boolean',
          description:
            'Also delete all edges referencing this spec (default: true)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'spec_search',
    description:
      'Search specs by title substring, tags, status, or author. Combines with RAG semantic search if a query string is provided.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search query',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        status: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by status values',
        },
        author: {
          type: 'string',
          description: 'Filter by author ID',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
      },
    },
  },
  {
    name: 'spec_list_documents',
    description: 'List all spec documents with their metadata and spec counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by document status',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
      },
    },
  },
  {
    name: 'spec_create_document',
    description:
      'Create a new spec document to group related specs. Returns the created document with its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Document title (1-500 chars)',
        },
        description: {
          type: 'string',
          description: 'Document description (max 2000 chars)',
        },
        specIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Initial spec IDs to include',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'spec_get_document',
    description:
      'Get a spec document by ID, including its ordered list of specs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentId: {
          type: 'string',
          description: 'The document ID',
        },
        includeSpecContent: {
          type: 'boolean',
          description: 'Include full content for each spec (default: false)',
        },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'spec_update_document',
    description:
      'Update an existing spec document. Only provided fields are changed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentId: {
          type: 'string',
          description: 'The document ID to update',
        },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        specIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'New ordered list of spec IDs',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: 'New status',
        },
      },
      required: ['documentId'],
    },
  },
] as const;

type SpecArgs = Record<string, unknown>;

async function handleSpecCreate(api: ApiClient, args: SpecArgs) {
  const { title, content } = args;
  if (!title || !content) {
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'title and content are required',
      retryable: false,
    });
  }

  const result = await api.post('/specs', {
    title,
    content,
    tags: args['tags'],
    status: args['status'] ?? 'draft',
    summary: args['summary'],
    documentId: args['documentId'],
  });
  return formatToolResult(result);
}

async function handleSpecUpdate(api: ApiClient, args: SpecArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const body: Record<string, unknown> = {};
  for (const key of [
    'title',
    'content',
    'tags',
    'status',
    'summary',
  ] as const) {
    if (args[key] !== undefined) body[key] = args[key];
  }

  const result = await api.put(`/specs/${specId}`, body);
  return formatToolResult(result);
}

async function handleSpecDelete(api: ApiClient, args: SpecArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const params = new URLSearchParams();
  const cascade = args['cascadeEdges'] ?? true;
  params.set('cascadeEdges', String(cascade));

  const result = await api.delete(`/specs/${specId}?${params.toString()}`);
  return formatToolResult(result);
}

async function handleSpecSearch(api: ApiClient, args: SpecArgs) {
  const result = await api.post('/specs/search', {
    query: args['query'],
    tags: args['tags'],
    status: args['status'],
    author: args['author'],
    limit: args['limit'] ?? 20,
    offset: args['offset'] ?? 0,
  });
  return formatToolResult(result);
}

async function handleSpecListDocuments(api: ApiClient, args: SpecArgs) {
  const params = new URLSearchParams();
  if (args['status']) params.set('status', String(args['status']));
  if (args['limit'] !== undefined) params.set('limit', String(args['limit']));
  if (args['offset'] !== undefined)
    params.set('offset', String(args['offset']));

  const qs = params.toString();
  const result = await api.get(`/documents${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handleSpecCreateDocument(api: ApiClient, args: SpecArgs) {
  const { title } = args;
  if (!title)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'title is required',
      retryable: false,
    });

  const result = await api.post('/documents', {
    title,
    description: args['description'],
    specIds: args['specIds'],
    tags: args['tags'],
  });
  return formatToolResult(result);
}

async function handleSpecGetDocument(api: ApiClient, args: SpecArgs) {
  const documentId = args['documentId'] as string | undefined;
  if (!documentId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'documentId is required',
      retryable: false,
    });

  const params = new URLSearchParams();
  if (args['includeSpecContent'] !== undefined)
    params.set('includeSpecContent', String(args['includeSpecContent']));

  const qs = params.toString();
  const result = await api.get(`/documents/${documentId}${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handleSpecUpdateDocument(api: ApiClient, args: SpecArgs) {
  const documentId = args['documentId'] as string | undefined;
  if (!documentId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'documentId is required',
      retryable: false,
    });

  const body: Record<string, unknown> = {};
  for (const key of ['title', 'description', 'specIds', 'status'] as const) {
    if (args[key] !== undefined) body[key] = args[key];
  }

  const result = await api.put(`/documents/${documentId}`, body);
  return formatToolResult(result);
}

export const specHandlers: Record<
  string,
  (
    api: ApiClient,
    args: SpecArgs,
  ) => Promise<ReturnType<typeof formatToolResult>>
> = {
  spec_create: handleSpecCreate,
  spec_update: handleSpecUpdate,
  spec_delete: handleSpecDelete,
  spec_search: handleSpecSearch,
  spec_list_documents: handleSpecListDocuments,
  spec_create_document: handleSpecCreateDocument,
  spec_get_document: handleSpecGetDocument,
  spec_update_document: handleSpecUpdateDocument,
};
