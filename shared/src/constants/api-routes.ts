const BASE = '/api/v1';

export const API_ROUTES = {
  AUTH: {
    REGISTER: `${BASE}/auth/register`,
    LOGIN: `${BASE}/auth/login`,
    LOGOUT: `${BASE}/auth/logout`,
    ME: `${BASE}/auth/me`,
    REFRESH: `${BASE}/auth/refresh`,
  },
  USERS: {
    BASE: `${BASE}/users`,
    BY_ID: (id: string) => `${BASE}/users/${id}`,
  },
  SPECS: {
    BASE: `${BASE}/specs`,
    BY_ID: (id: string) => `${BASE}/specs/${id}`,
    VERSIONS: (id: string) => `${BASE}/specs/${id}/versions`,
    DIFF: (id: string) => `${BASE}/specs/${id}/diff`,
    REVERT: (id: string) => `${BASE}/specs/${id}/revert`,
    PERMISSIONS: (id: string) => `${BASE}/specs/${id}/permissions`,
  },
  DOCUMENTS: {
    BASE: `${BASE}/documents`,
    BY_ID: (id: string) => `${BASE}/documents/${id}`,
    SPECS: (id: string) => `${BASE}/documents/${id}/specs`,
  },
  GRAPH: {
    QUERY: `${BASE}/graph/query`,
    EDGES: `${BASE}/graph/edges`,
    EDGE_BY_ID: (id: string) => `${BASE}/graph/edges/${id}`,
    INQUIRY: `${BASE}/graph/inquiry`,
  },
  AGENT: {
    SESSIONS: `${BASE}/agent/sessions`,
    SESSION_BY_ID: (id: string) => `${BASE}/agent/sessions/${id}`,
    MESSAGES: (sessionId: string) => `${BASE}/agent/sessions/${sessionId}/messages`,
  },
  RAG: {
    SEARCH: `${BASE}/rag/search`,
    EMBED: `${BASE}/rag/embed`,
  },
  GIT: {
    HISTORY: `${BASE}/git/history`,
    BRANCHES: `${BASE}/git/branches`,
    MERGE: `${BASE}/git/merge`,
  },
} as const;
