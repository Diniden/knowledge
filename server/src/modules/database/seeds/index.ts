import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from 'bcryptjs';
import { users } from '../schema/users.js';
import { projects } from '../schema/projects.js';
import { projectMembers } from '../schema/project-members.js';

const SEED_PASSWORD = 'Password123!';
const BCRYPT_ROUNDS = 12;

async function seed() {
  const databaseUrl = process.env['DATABASE_URL'];
  const sql = databaseUrl
    ? postgres(databaseUrl)
    : postgres({
        host: process.env['DATABASE_HOST'] ?? 'localhost',
        port: Number(process.env['DATABASE_PORT'] ?? 5432),
        database: process.env['DATABASE_NAME'] ?? 'kg_dev',
        user: process.env['DATABASE_USER'] ?? 'kg_user',
        password: process.env['DATABASE_PASSWORD'] ?? 'changeme',
      });

  const db = drizzle(sql);

  console.log('Seeding database...');

  const passwordHash = await hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  const [admin, alice, bob] = await db
    .insert(users)
    .values([
      {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash,
        displayName: 'Admin User',
        emailVerified: true,
      },
      {
        email: 'alice@example.com',
        username: 'alice',
        passwordHash,
        displayName: 'Alice Developer',
        emailVerified: true,
      },
      {
        email: 'bob@example.com',
        username: 'bob',
        passwordHash,
        displayName: 'Bob Viewer',
        emailVerified: false,
      },
    ])
    .returning();

  console.log(
    `  Seeded users: admin (${admin!.id}), alice (${alice!.id}), bob (${bob!.id})`,
  );

  const [sampleProject] = await db
    .insert(projects)
    .values({
      name: 'Sample Knowledge Graph',
      description: 'A sample project for development and testing.',
      ownerId: admin!.id,
    })
    .returning();

  console.log(
    `  Seeded project: "${sampleProject!.name}" (${sampleProject!.id})`,
  );

  await db.insert(projectMembers).values([
    { projectId: sampleProject!.id, userId: admin!.id, role: 'admin' },
    { projectId: sampleProject!.id, userId: alice!.id, role: 'editor' },
    { projectId: sampleProject!.id, userId: bob!.id, role: 'viewer' },
  ]);

  console.log(
    '  Seeded project members: admin (admin), alice (editor), bob (viewer)',
  );

  await sql.end();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
