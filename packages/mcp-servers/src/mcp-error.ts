/**
 * MCP tool error types and formatting utilities.
 */

export type McpToolErrorCode =
  | 'ENTITY_NOT_FOUND'
  | 'ENTITY_ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'STORAGE_ERROR'
  | 'SEARCH_ERROR'
  | 'BUILD_ERROR'
  | 'GIT_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

export interface McpToolError {
  code: McpToolErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
  suggestion?: string;
}

export class ToolError extends Error {
  readonly code: McpToolErrorCode;
  readonly details?: unknown;
  readonly retryable: boolean;
  readonly suggestion?: string;

  constructor(opts: McpToolError) {
    super(opts.message);
    this.name = 'ToolError';
    this.code = opts.code;
    this.details = opts.details;
    this.retryable = opts.retryable;
    this.suggestion = opts.suggestion;
  }

  toToolResult(): {
    content: Array<{ type: 'text'; text: string }>;
    isError: true;
  } {
    const payload: McpToolError = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };

    if (this.details !== undefined) payload.details = this.details;
    if (this.suggestion !== undefined) payload.suggestion = this.suggestion;

    return {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      isError: true,
    };
  }
}

export function formatToolResult(data: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
