import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/modules/database/schema/index.ts',
  out: './src/modules/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: Number(process.env['DATABASE_PORT']) || 5432,
    database: process.env['DATABASE_NAME'] || 'kg_dev',
    user: process.env['DATABASE_USER'] || 'kg_user',
    password: process.env['DATABASE_PASSWORD'] || 'changeme',
  },
});
