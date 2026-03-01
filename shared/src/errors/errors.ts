import { ERROR_CODES, type ErrorCode } from './error-codes.js';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, details?: Record<string, unknown>) {
    super(
      ERROR_CODES.NOT_FOUND,
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      details,
      404,
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details, 400);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details?: Record<string, unknown>) {
    super(ERROR_CODES.AUTHORIZATION_ERROR, message, details, 403);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(ERROR_CODES.AUTHENTICATION_ERROR, message, details, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.CONFLICT_ERROR, message, details, 409);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred', details?: Record<string, unknown>) {
    super(ERROR_CODES.INTERNAL_ERROR, message, details, 500);
  }
}
