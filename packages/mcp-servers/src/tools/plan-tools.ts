/**
 * Plan generation MCP tools — create, retrieve, list, and approve execution plans.
 */

import type { ApiClient } from './api-client.js';
import { ToolError, formatToolResult } from '../mcp-error.js';

export const PLAN_TOOL_DEFINITIONS = [
  {
    name: 'plan_create',
    description:
      'Generate an execution plan from a root spec. Traverses the graph, gathers RAG context, and writes plan files.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        rootSpecId: {
          type: 'string',
          description: 'The root spec ID to plan from',
        },
        mode: {
          type: 'string',
          enum: ['full', 'delta'],
          description:
            'Generation mode: full rebuild or delta from changes (default: full)',
        },
        targetDirectory: {
          type: 'string',
          description: 'Directory path to write plan files to',
        },
        maxDepth: {
          type: 'number',
          description: 'Max graph traversal depth (default: 5)',
        },
        includeRagContext: {
          type: 'boolean',
          description:
            'Include RAG-retrieved supplementary context (default: true)',
        },
      },
      required: ['rootSpecId', 'targetDirectory'],
    },
  },
  {
    name: 'plan_get',
    description:
      'Retrieve plan metadata, file listing, and optionally all plan file contents.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        planId: {
          type: 'string',
          description: 'The plan ID',
        },
        includeContent: {
          type: 'boolean',
          description: 'Include all plan file contents (default: false)',
        },
      },
      required: ['planId'],
    },
  },
  {
    name: 'plan_list',
    description: 'List plans for a project, optionally filtered by status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        status: {
          type: 'string',
          enum: ['draft', 'approved', 'executing', 'completed', 'failed'],
          description: 'Filter by plan status',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20)',
        },
      },
    },
  },
  {
    name: 'plan_approve',
    description: 'Approve a plan for execution. Plan must be in draft status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        planId: {
          type: 'string',
          description: 'The plan ID to approve',
        },
        notes: {
          type: 'string',
          description: 'Optional approval notes',
        },
      },
      required: ['planId'],
    },
  },
  {
    name: 'plan_get_delta',
    description:
      'Find specs modified since a given timestamp or commit, optionally scoped to a root spec subgraph.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        since: {
          type: 'string',
          description: 'ISO 8601 timestamp to check changes from',
        },
        sinceCommit: {
          type: 'string',
          description: 'Git commit hash to check changes from',
        },
        rootSpecId: {
          type: 'string',
          description: 'Scope to subgraph of this root spec',
        },
      },
    },
  },
  {
    name: 'plan_get_execution_status',
    description: 'Get execution status for each step of a plan.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        planId: {
          type: 'string',
          description: 'The plan ID',
        },
      },
      required: ['planId'],
    },
  },
] as const;

type PlanArgs = Record<string, unknown>;

async function handlePlanCreate(api: ApiClient, args: PlanArgs) {
  const { rootSpecId, targetDirectory } = args;
  if (!rootSpecId || !targetDirectory) {
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'rootSpecId and targetDirectory are required',
      retryable: false,
    });
  }

  const result = await api.post('/plans', {
    rootSpecId,
    targetDirectory,
    mode: args['mode'] ?? 'full',
    maxDepth: args['maxDepth'] ?? 5,
    includeRagContext: args['includeRagContext'] ?? true,
  });
  return formatToolResult(result);
}

async function handlePlanGet(api: ApiClient, args: PlanArgs) {
  const planId = args['planId'] as string | undefined;
  if (!planId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'planId is required',
      retryable: false,
    });

  const params = new URLSearchParams();
  if (args['includeContent'] !== undefined)
    params.set('includeContent', String(args['includeContent']));

  const qs = params.toString();
  const result = await api.get(`/plans/${planId}${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handlePlanList(api: ApiClient, args: PlanArgs) {
  const params = new URLSearchParams();
  if (args['projectId']) params.set('projectId', String(args['projectId']));
  if (args['status']) params.set('status', String(args['status']));
  if (args['limit'] !== undefined) params.set('limit', String(args['limit']));

  const qs = params.toString();
  const result = await api.get(`/plans${qs ? `?${qs}` : ''}`);
  return formatToolResult(result);
}

async function handlePlanApprove(api: ApiClient, args: PlanArgs) {
  const planId = args['planId'] as string | undefined;
  if (!planId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'planId is required',
      retryable: false,
    });

  const result = await api.post(`/plans/${planId}/approve`, {
    notes: args['notes'],
  });
  return formatToolResult(result);
}

async function handlePlanGetDelta(api: ApiClient, args: PlanArgs) {
  const result = await api.post('/plans/delta', {
    since: args['since'],
    sinceCommit: args['sinceCommit'],
    rootSpecId: args['rootSpecId'],
  });
  return formatToolResult(result);
}

async function handlePlanGetExecutionStatus(api: ApiClient, args: PlanArgs) {
  const planId = args['planId'] as string | undefined;
  if (!planId)
    throw new ToolError({
      code: 'VALIDATION_ERROR',
      message: 'planId is required',
      retryable: false,
    });

  const result = await api.get(`/plans/${planId}/execution-status`);
  return formatToolResult(result);
}

export const planHandlers: Record<
  string,
  (
    api: ApiClient,
    args: PlanArgs,
  ) => Promise<ReturnType<typeof formatToolResult>>
> = {
  plan_create: handlePlanCreate,
  plan_get: handlePlanGet,
  plan_list: handlePlanList,
  plan_approve: handlePlanApprove,
  plan_get_delta: handlePlanGetDelta,
  plan_get_execution_status: handlePlanGetExecutionStatus,
};
