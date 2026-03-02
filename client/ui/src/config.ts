export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:4000',
  appName: import.meta.env.VITE_APP_NAME || 'Knowledge Graph',
} as const;
