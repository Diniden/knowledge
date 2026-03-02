const API_BASE = '/api/v1';

// --- Auth ---
export const AUTH_ROUTES = {
  LOGIN: `${API_BASE}/auth/login`,
  REGISTER: `${API_BASE}/auth/register`,
  REFRESH: `${API_BASE}/auth/refresh`,
  ME: `${API_BASE}/auth/me`,
} as const;

// --- Specs ---
export const SPECS_ROUTES = {
  BASE: `${API_BASE}/specs`,
  BY_ID: (id: string) => `${API_BASE}/specs/${id}`,
  VERSIONS: (id: string) => `${API_BASE}/specs/${id}/versions`,
  VERSION: (id: string, version: number) =>
    `${API_BASE}/specs/${id}/versions/${version}`,
  DIFF: (id: string) => `${API_BASE}/specs/${id}/diff`,
  EDGES: (id: string) => `${API_BASE}/specs/${id}/edges`,
  PERMISSIONS: (id: string) => `${API_BASE}/specs/${id}/permissions`,
} as const;

// --- Documents ---
export const DOCUMENTS_ROUTES = {
  BASE: `${API_BASE}/documents`,
  BY_ID: (id: string) => `${API_BASE}/documents/${id}`,
  SPECS: (id: string) => `${API_BASE}/documents/${id}/specs`,
} as const;

// --- Graph ---
export const GRAPH_ROUTES = {
  QUERY: `${API_BASE}/graph/query`,
  NEIGHBORS: (specId: string) => `${API_BASE}/graph/${specId}/neighbors`,
  PATH: `${API_BASE}/graph/path`,
  SEARCH: `${API_BASE}/graph/search`,
} as const;

// --- Agent ---
export const AGENT_ROUTES = {
  SESSIONS: `${API_BASE}/agent/sessions`,
  SESSION: (id: string) => `${API_BASE}/agent/sessions/${id}`,
  MESSAGE: (sessionId: string) =>
    `${API_BASE}/agent/sessions/${sessionId}/messages`,
  MESSAGES: (sessionId: string) =>
    `${API_BASE}/agent/sessions/${sessionId}/messages`,
} as const;

// --- Versions ---
export const VERSION_ROUTES = {
  HISTORY: (specId: string) => `${API_BASE}/versions/${specId}`,
  DIFF: (specId: string) => `${API_BASE}/versions/${specId}/diff`,
  RESTORE: (specId: string, version: number) =>
    `${API_BASE}/versions/${specId}/restore/${version}`,
} as const;

// --- Users ---
export const USERS_ROUTES = {
  BASE: `${API_BASE}/users`,
  BY_ID: (id: string) => `${API_BASE}/users/${id}`,
  PROFILE: `${API_BASE}/users/profile`,
} as const;

// --- Permissions ---
export const PERMISSIONS_ROUTES = {
  GRANT: `${API_BASE}/permissions/grant`,
  REVOKE: (id: string) => `${API_BASE}/permissions/${id}`,
  CHECK: `${API_BASE}/permissions/check`,
} as const;

// --- Gen UI ---
export const GENUI_ROUTES = {
  REGISTRY: `${API_BASE}/genui/registry`,
  COMPONENT: (id: string) => `${API_BASE}/genui/registry/${id}`,
  RENDER: (id: string) => `${API_BASE}/genui/${id}/render`,
} as const;

// --- Health ---
export const HEALTH_ROUTES = {
  CHECK: `${API_BASE}/health`,
} as const;
