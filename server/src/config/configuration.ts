export function configuration() {
  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    database: {
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/kg_db',
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      expiration: process.env.JWT_EXPIRATION ?? '7d',
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    },
  };
}
