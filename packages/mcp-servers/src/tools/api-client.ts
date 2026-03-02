/**
 * HTTP client for calling the NestJS server API from MCP tool handlers.
 *
 * MCP tools are thin wrappers — they validate inputs, call the API, and format
 * the response. This client handles auth headers, base URL resolution, and
 * structured error handling.
 */

import { ToolError } from '../mcp-error.js';

export interface ApiClientOptions {
  baseUrl?: string;
  authToken?: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly authToken: string | undefined;

  constructor(opts?: ApiClientOptions) {
    this.baseUrl =
      opts?.baseUrl ??
      process.env['API_BASE_URL'] ??
      'http://localhost:3001/api/v1';
    this.authToken =
      opts?.authToken ?? process.env['API_AUTH_TOKEN'] ?? undefined;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Network request failed';
      throw new ToolError({
        code: 'STORAGE_ERROR',
        message: `API request failed: ${message}`,
        retryable: true,
        suggestion: 'Check that the API server is running and reachable.',
      });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const code =
        response.status === 404
          ? ('ENTITY_NOT_FOUND' as const)
          : response.status === 403
            ? ('PERMISSION_DENIED' as const)
            : response.status === 429
              ? ('RATE_LIMITED' as const)
              : response.status === 422
                ? ('VALIDATION_ERROR' as const)
                : ('STORAGE_ERROR' as const);

      throw new ToolError({
        code,
        message: `API ${method} ${path} returned ${response.status}: ${text}`,
        retryable: code === 'RATE_LIMITED' || code === 'STORAGE_ERROR',
        details: { status: response.status, body: text },
      });
    }

    return (await response.json()) as T;
  }
}
