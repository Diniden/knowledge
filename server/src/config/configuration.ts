export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    url: string;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
  agent: {
    claudeApiKey: string;
    embeddingApiKey: string;
    embeddingModel: string;
  };
  git: {
    userName: string;
    userEmail: string;
  };
  logLevel: string;
}

export function configuration(): AppConfig {
  const optional = (key: string, defaultValue: string): string => {
    return process.env[key] ?? defaultValue;
  };

  return {
    port: parseInt(optional('PORT', '4000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3000'),
    database: {
      host: optional('DATABASE_HOST', 'localhost'),
      port: parseInt(optional('DATABASE_PORT', '5432'), 10),
      name: optional('DATABASE_NAME', 'kg_development'),
      user: optional('DATABASE_USER', 'postgres'),
      password: optional('DATABASE_PASSWORD', 'postgres'),
      url:
        process.env['DATABASE_URL'] ??
        `postgresql://${optional('DATABASE_USER', 'postgres')}:${optional('DATABASE_PASSWORD', 'postgres')}@${optional('DATABASE_HOST', 'localhost')}:${optional('DATABASE_PORT', '5432')}/${optional('DATABASE_NAME', 'kg_development')}`,
    },
    jwt: {
      secret: optional('JWT_SECRET', 'change-me-in-production'),
      expiration: optional('JWT_EXPIRATION', '7d'),
    },
    agent: {
      claudeApiKey: optional('CLAUDE_API_KEY', ''),
      embeddingApiKey: optional('EMBEDDING_API_KEY', ''),
      embeddingModel: optional('EMBEDDING_MODEL', 'text-embedding-3-small'),
    },
    git: {
      userName: optional('GIT_USER_NAME', 'Knowledge Graph Agent'),
      userEmail: optional('GIT_USER_EMAIL', 'agent@kg.local'),
    },
    logLevel: optional('LOG_LEVEL', 'info'),
  };
}
