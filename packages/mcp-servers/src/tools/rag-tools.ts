/**
 * RAG (Retrieval-Augmented Generation) MCP tools — semantic search, similarity, and embedding management.
 */

import type { ApiClient } from './api-client.js';
import { ToolError, formatToolResult } from '../mcp-error.js';

export const RAG_TOOL_DEFINITIONS = [
  {
    name: 'rag_search',
    description:
      'Semantic search across all specs. Returns ranked results with spec ID, chunk text, and similarity score.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        topK: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 50)',
        },
        minScore: {
          type: 'number',
          description: 'Minimum similarity score threshold (default: 0.5)',
        },
        filterTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only include specs with these tags',
        },
        filterStatus: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only include specs with these statuses',
        },
        excludeSpecIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exclude these spec IDs from results',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'rag_find_related',
    description:
      'Find specs semantically related to a given spec using its existing embedding. No text query needed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to find related specs for',
        },
        topK: {
          type: 'number',
          description: 'Number of results (default: 10)',
        },
        excludeSelf: {
          type: 'boolean',
          description: 'Exclude the source spec from results (default: true)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'rag_get_context',
    description:
      'Build rich context for a query by combining semantic search results with graph neighbor data. Useful for comprehensive understanding of a topic.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to build context for',
        },
        topK: {
          type: 'number',
          description: 'Number of search results to include (default: 5)',
        },
        expandDepth: {
          type: 'number',
          description: 'Graph traversal depth from each result (default: 1)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'rag_multi_query',
    description:
      'Execute multiple semantic queries in parallel and fuse results using reciprocal rank fusion (RRF) or averaging.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        queries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of search queries (1-5)',
        },
        topK: {
          type: 'number',
          description: 'Number of results per query (default: 10)',
        },
        fusionMethod: {
          type: 'string',
          enum: ['rrf', 'average'],
          description: 'Result fusion method (default: rrf)',
        },
      },
      required: ['queries'],
    },
  },
  {
    name: 'rag_index_spec',
    description:
      'Trigger embedding generation for a spec. Skips if content unchanged unless forceReindex is true.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to index',
        },
        forceReindex: {
          type: 'boolean',
          description:
            'Force reindex even if content hash matches (default: false)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'rag_get_embedding_status',
    description:
      'Check whether a spec has a current embedding and whether it is stale.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to check',
        },
      },
      required: ['specId'],
    },
  },
] as const;

type RagArgs = Record<string, unknown>;

async function handleRagSearch(api: ApiClient, args: RagArgs) {
  const query = args['query'] as string | undefined;
  if (!query)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'query is required',
      retryable: false,
    });

  const result = await api.post('/rag/search', {
    query,
    topK: args['topK'] ?? 10,
    minScore: args['minScore'] ?? 0.5,
    filterTags: args['filterTags'],
    filterStatus: args['filterStatus'],
    excludeSpecIds: args['excludeSpecIds'],
  });
  return formatToolResult(result);
}

async function handleRagFindRelated(api: ApiClient, args: RagArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const result = await api.post('/rag/find-related', {
    specId,
    topK: args['topK'] ?? 10,
    excludeSelf: args['excludeSelf'] ?? true,
  });
  return formatToolResult(result);
}

async function handleRagGetContext(api: ApiClient, args: RagArgs) {
  const query = args['query'] as string | undefined;
  if (!query)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'query is required',
      retryable: false,
    });

  const result = await api.post('/rag/context', {
    query,
    topK: args['topK'] ?? 5,
    expandDepth: args['expandDepth'] ?? 1,
  });
  return formatToolResult(result);
}

async function handleRagMultiQuery(api: ApiClient, args: RagArgs) {
  const queries = args['queries'] as string[] | undefined;
  if (!queries || queries.length === 0) {
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'queries array is required and must not be empty',
      retryable: false,
    });
  }

  const result = await api.post('/rag/multi-query', {
    queries,
    topK: args['topK'] ?? 10,
    fusionMethod: args['fusionMethod'] ?? 'rrf',
  });
  return formatToolResult(result);
}

async function handleRagIndexSpec(api: ApiClient, args: RagArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const result = await api.post('/rag/index', {
    specId,
    forceReindex: args['forceReindex'] ?? false,
  });
  return formatToolResult(result);
}

async function handleRagGetEmbeddingStatus(api: ApiClient, args: RagArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const result = await api.get(`/rag/embedding-status/${specId}`);
  return formatToolResult(result);
}

export const ragHandlers: Record<
  string,
  (
    api: ApiClient,
    args: RagArgs,
  ) => Promise<ReturnType<typeof formatToolResult>>
> = {
  rag_search: handleRagSearch,
  rag_find_related: handleRagFindRelated,
  rag_get_context: handleRagGetContext,
  rag_multi_query: handleRagMultiQuery,
  rag_index_spec: handleRagIndexSpec,
  rag_get_embedding_status: handleRagGetEmbeddingStatus,
};
