function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const config = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL', 'http://localhost:4000/api/v1'),
  wsUrl: getEnv('VITE_WS_URL', 'ws://localhost:4000/ws'),
  appName: getEnv('VITE_APP_NAME', 'Knowledge Graph'),
} as const;
