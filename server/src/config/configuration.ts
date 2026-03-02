import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  corsOrigin: string;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
  anthropic: {
    apiKey: string;
  };
  embedding: {
    modelPath: string;
    provider: string;
  };
  logLevel: string;
}

export const configuration = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env['PORT'] ?? '4000', 10),
    corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    database: {
      host: process.env['DATABASE_HOST'] ?? 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] ?? '5432', 10),
      name: process.env['DATABASE_NAME'] ?? 'kg_dev',
      user: process.env['DATABASE_USER'] ?? 'kg_user',
      password: process.env['DATABASE_PASSWORD'] ?? 'changeme',
    },
    jwt: {
      secret:
        process.env['JWT_SECRET'] ??
        'change-this-to-a-secure-secret-at-least-32-chars',
      expiration: process.env['JWT_EXPIRATION'] ?? '7d',
    },
    anthropic: {
      apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
    },
    embedding: {
      modelPath: process.env['EMBEDDING_MODEL_PATH'] ?? 'nomic-embed-text',
      provider: process.env['EMBEDDING_PROVIDER'] ?? 'local',
    },
    logLevel: process.env['LOG_LEVEL'] ?? 'debug',
  }),
);
