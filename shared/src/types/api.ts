export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export function successResponse<T>(data: T, pagination?: PaginationMeta): ApiResponse<T> {
  const response: ApiResponse<T> = { success: true, data };
  if (pagination !== undefined) response.pagination = pagination;
  return response;
}

export function errorResponse(code: string, message: string, details?: Record<string, unknown>): ApiResponse<never> {
  const error: ApiError = { code, message };
  if (details !== undefined) error.details = details;
  return { success: false, error };
}
