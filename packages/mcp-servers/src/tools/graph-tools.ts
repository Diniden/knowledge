/**
 * Knowledge Graph MCP tools — spec retrieval, edge management, traversal, and path finding.
 */

import type { ApiClient } from './api-client.js';
import { ToolError, formatToolResult } from '../mcp-error.js';

export const GRAPH_TOOL_DEFINITIONS = [
  {
    name: 'graph_get_spec',
    description:
      'Read a spec by ID from the knowledge graph. Returns spec content, metadata, and optionally connected edges.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID (e.g. sp_abc123)',
        },
        includeContent: {
          type: 'boolean',
          description: 'Include full spec content (default: true)',
        },
        includeEdges: {
          type: 'boolean',
          description: 'Include connected edges (default: false)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'graph_list_specs',
    description:
      'List all specs, optionally filtered by document ID or status. Returns paginated spec summaries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        documentId: {
          type: 'string',
          description: 'Filter by document ID',
        },
        status: {
          type: 'string',
          description: 'Filter by status (draft, active, deprecated, archived)',
        },
        sortBy: {
          type: 'string',
          enum: ['title', 'updatedAt', 'createdAt'],
          description: 'Sort field (default: updatedAt)',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction (default: desc)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default: 50, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
      },
    },
  },
  {
    name: 'graph_get_edges',
    description:
      'Get all edges connected to a spec, optionally filtered by direction, type, or confidence.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The spec ID to find edges for',
        },
        direction: {
          type: 'string',
          enum: ['outgoing', 'incoming', 'both'],
          description: 'Edge direction filter (default: both)',
        },
        edgeType: {
          type: 'string',
          description:
            'Filter by edge type (derived-from, depends-on, related-to, contradicts, supersedes)',
        },
        minConfidence: {
          type: 'number',
          description: 'Minimum confidence threshold (0-1)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'graph_create_edge',
    description:
      'Create a new edge between two specs. Validates that both specs exist and no duplicate edge exists.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sourceSpecId: {
          type: 'string',
          description: 'Source spec ID',
        },
        targetSpecId: {
          type: 'string',
          description: 'Target spec ID',
        },
        type: {
          type: 'string',
          enum: [
            'derived-from',
            'depends-on',
            'related-to',
            'contradicts',
            'supersedes',
          ],
          description: 'Edge relationship type',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)',
        },
        strength: {
          type: 'string',
          enum: ['strong', 'moderate', 'weak'],
          description: 'Edge strength',
        },
        rationale: {
          type: 'string',
          description: 'Explanation for why this edge exists',
        },
      },
      required: [
        'sourceSpecId',
        'targetSpecId',
        'type',
        'confidence',
        'strength',
        'rationale',
      ],
    },
  },
  {
    name: 'graph_delete_edge',
    description: 'Delete an edge by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        edgeId: {
          type: 'string',
          description: 'The edge ID to delete (e.g. eg_abc123)',
        },
      },
      required: ['edgeId'],
    },
  },
  {
    name: 'graph_get_neighbors',
    description:
      'Get all specs connected to a given spec via BFS traversal up to a specified depth.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: {
          type: 'string',
          description: 'The starting spec ID',
        },
        depth: {
          type: 'number',
          description: 'Max traversal depth (default: 2, max: 5)',
        },
        edgeTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by edge types',
        },
        direction: {
          type: 'string',
          enum: ['outgoing', 'incoming', 'both'],
          description: 'Traversal direction (default: both)',
        },
        maxNodes: {
          type: 'number',
          description: 'Max nodes to return (default: 50, max: 100)',
        },
        includeContent: {
          type: 'boolean',
          description:
            'Include full spec content for each node (default: false)',
        },
      },
      required: ['specId'],
    },
  },
  {
    name: 'graph_find_path',
    description:
      'Find the shortest path between two specs in the graph using BFS. Returns null if no path exists.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        fromSpecId: {
          type: 'string',
          description: 'Starting spec ID',
        },
        toSpecId: {
          type: 'string',
          description: 'Target spec ID',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum search depth (default: 5, max: 10)',
        },
        edgeTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by edge types',
        },
      },
      required: ['fromSpecId', 'toSpecId'],
    },
  },
  {
    name: 'graph_get_stats',
    description:
      'Get summary statistics of the knowledge graph: total specs, edges, documents, orphans, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        includeDetails: {
          type: 'boolean',
          description:
            'Include top-connected specs and recent changes (default: false)',
        },
      },
    },
  },
] as const;

type GraphArgs = Record<string, unknown>;

async function handleGraphGetSpec(api: ApiClient, args: GraphArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const params = new URLSearchParams();
  if (args['includeContent'] !== undefined)
    params.set('includeContent', String(args['includeContent']));
  if (args['includeEdges'] !== undefined)
    params.set('includeEdges', String(args['includeEdges']));

  const qs = params.toString();
  const result = await api.get(`/specs/${specId}${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handleGraphListSpecs(api: ApiClient, args: GraphArgs) {
  const params = new URLSearchParams();
  if (args['documentId']) params.set('documentId', String(args['documentId']));
  if (args['status']) params.set('status', String(args['status']));
  if (args['sortBy']) params.set('sortBy', String(args['sortBy']));
  if (args['sortOrder']) params.set('sortOrder', String(args['sortOrder']));
  if (args['limit'] !== undefined) params.set('limit', String(args['limit']));
  if (args['offset'] !== undefined)
    params.set('offset', String(args['offset']));

  const qs = params.toString();
  const result = await api.get(`/specs${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handleGraphGetEdges(api: ApiClient, args: GraphArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const params = new URLSearchParams();
  if (args['direction']) params.set('direction', String(args['direction']));
  if (args['edgeType']) params.set('edgeType', String(args['edgeType']));
  if (args['minConfidence'] !== undefined)
    params.set('minConfidence', String(args['minConfidence']));

  const qs = params.toString();
  const result = await api.get(`/specs/${specId}/edges${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handleGraphCreateEdge(api: ApiClient, args: GraphArgs) {
  const { sourceSpecId, targetSpecId, type, confidence, strength, rationale } =
    args;
  if (
    !sourceSpecId ||
    !targetSpecId ||
    !type ||
    confidence === undefined ||
    !strength ||
    !rationale
  ) {
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message:
        'sourceSpecId, targetSpecId, type, confidence, strength, and rationale are required',
      retryable: false,
    });
  }

  const result = await api.post('/edges', {
    sourceSpecId,
    targetSpecId,
    type,
    confidence,
    strength,
    rationale,
    context: args['context'],
  });
  return formatToolResult(result);
}

async function handleGraphDeleteEdge(api: ApiClient, args: GraphArgs) {
  const edgeId = args['edgeId'] as string | undefined;
  if (!edgeId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'edgeId is required',
      retryable: false,
    });

  const result = await api.delete(`/edges/${edgeId}`);
  return formatToolResult(result);
}

async function handleGraphGetNeighbors(api: ApiClient, args: GraphArgs) {
  const specId = args['specId'] as string | undefined;
  if (!specId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'specId is required',
      retryable: false,
    });

  const result = await api.post('/graph/traverse', {
    startSpecId: specId,
    maxDepth: args['depth'] ?? 2,
    edgeTypes: args['edgeTypes'],
    direction: args['direction'] ?? 'both',
    maxNodes: args['maxNodes'] ?? 50,
    includeContent: args['includeContent'] ?? false,
  });
  return formatToolResult(result);
}

async function handleGraphFindPath(api: ApiClient, args: GraphArgs) {
  const { fromSpecId, toSpecId } = args;
  if (!fromSpecId || !toSpecId) {
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'fromSpecId and toSpecId are required',
      retryable: false,
    });
  }

  const result = await api.post('/graph/find-path', {
    sourceSpecId: fromSpecId,
    targetSpecId: toSpecId,
    maxDepth: args['maxDepth'] ?? 5,
    edgeTypes: args['edgeTypes'],
  });
  return formatToolResult(result);
}

async function handleGraphGetStats(api: ApiClient, args: GraphArgs) {
  const params = new URLSearchParams();
  if (args['includeDetails'] !== undefined)
    params.set('includeDetails', String(args['includeDetails']));

  const qs = params.toString();
  const result = await api.get(`/graph/stats${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

export const graphHandlers: Record<
  string,
  (
    api: ApiClient,
    args: GraphArgs,
  ) => Promise<ReturnType<typeof formatToolResult>>
> = {
  graph_get_spec: handleGraphGetSpec,
  graph_list_specs: handleGraphListSpecs,
  graph_get_edges: handleGraphGetEdges,
  graph_create_edge: handleGraphCreateEdge,
  graph_delete_edge: handleGraphDeleteEdge,
  graph_get_neighbors: handleGraphGetNeighbors,
  graph_find_path: handleGraphFindPath,
  graph_get_stats: handleGraphGetStats,
};
