const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000';
const appName = import.meta.env.VITE_APP_NAME ?? 'Knowledge Graph Agent System';

export const config = {
  apiBaseUrl,
  wsUrl,
  appName,
} as const;
