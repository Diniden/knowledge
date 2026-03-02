const API_PREFIX = '/api/v1';

export const AUTH_ROUTES = {
  LOGIN: `${API_PREFIX}/auth/login`,
  REGISTER: `${API_PREFIX}/auth/register`,
  LOGOUT: `${API_PREFIX}/auth/logout`,
  ME: `${API_PREFIX}/auth/me`,
  REFRESH: `${API_PREFIX}/auth/refresh`,
} as const;

export const SPEC_ROUTES = {
  BASE: `${API_PREFIX}/specs`,
  BY_ID: (id: string) => `${API_PREFIX}/specs/${id}`,
  DOCUMENTS: `${API_PREFIX}/specs/documents`,
  DOCUMENT_BY_ID: (id: string) => `${API_PREFIX}/specs/documents/${id}`,
} as const;

export const GRAPH_ROUTES = {
  BASE: `${API_PREFIX}/graph`,
  NODES: `${API_PREFIX}/graph/nodes`,
  EDGES: `${API_PREFIX}/graph/edges`,
  QUERY: `${API_PREFIX}/graph/query`,
} as const;

export const AGENT_ROUTES = {
  SESSIONS: `${API_PREFIX}/agent/sessions`,
  SESSION_BY_ID: (id: string) => `${API_PREFIX}/agent/sessions/${id}`,
  MESSAGES: (sessionId: string) =>
    `${API_PREFIX}/agent/sessions/${sessionId}/messages`,
} as const;

export const RAG_ROUTES = {
  SEARCH: `${API_PREFIX}/rag/search`,
  EMBED: `${API_PREFIX}/rag/embed`,
} as const;

export const GIT_ROUTES = {
  COMMIT: `${API_PREFIX}/git/commit`,
  BRANCH: `${API_PREFIX}/git/branch`,
  DIFF: `${API_PREFIX}/git/diff`,
} as const;
