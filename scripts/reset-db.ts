import { $ } from 'bun';

async function main() {
  console.info('Resetting development database...\n');

  console.info('Dropping and recreating database...');
  await $`docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS knowledge_graph"`;
  await $`docker compose exec postgres psql -U postgres -c "CREATE DATABASE knowledge_graph"`;

  console.info('Running migrations...');
  await $`bun run migrate`;

  console.info('Running seeds...');
  await $`bun run seed`;

  console.info('\nDatabase reset complete.');
}

main();
