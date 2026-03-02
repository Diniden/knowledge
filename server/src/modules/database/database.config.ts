import postgres from 'postgres';

export function createPostgresConnection() {
  const databaseUrl = process.env['DATABASE_URL'];

  if (databaseUrl) {
    return postgres(databaseUrl);
  }

  return postgres({
    host: process.env['DATABASE_HOST'] ?? 'localhost',
    port: Number(process.env['DATABASE_PORT'] ?? 5432),
    database: process.env['DATABASE_NAME'] ?? 'kg_dev',
    user: process.env['DATABASE_USER'] ?? 'kg_user',
    password: process.env['DATABASE_PASSWORD'] ?? 'changeme',
  });
}
