import {
  RESOURCE_NOT_FOUND,
  VALIDATION_FAILED,
  AUTHZ_FORBIDDEN,
  RESOURCE_CONFLICT,
  AGENT_PROCESS_ERROR,
  GIT_CONFLICT,
  GRAPH_INVALID_EDGE,
} from './error-codes.js';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(RESOURCE_NOT_FOUND, message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(VALIDATION_FAILED, message, 400, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(AUTHZ_FORBIDDEN, message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(RESOURCE_CONFLICT, message, 409, details);
  }
}

export class AgentError extends AppError {
  constructor(
    message: string,
    code: string = AGENT_PROCESS_ERROR,
    details?: Record<string, unknown>,
  ) {
    super(code, message, 500, details);
  }
}

export class GitError extends AppError {
  constructor(
    message: string,
    code: string = GIT_CONFLICT,
    details?: Record<string, unknown>,
  ) {
    super(code, message, 500, details);
  }
}

export class GraphError extends AppError {
  constructor(
    message: string,
    code: string = GRAPH_INVALID_EDGE,
    details?: Record<string, unknown>,
  ) {
    super(code, message, 400, details);
  }
}
