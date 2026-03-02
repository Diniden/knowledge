import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    gitRemoteUrl: text('git_remote_url'),
    localRepoPath: text('local_repo_path'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    isArchived: boolean('is_archived').notNull().default(false),
    settingsJson: jsonb('settings_json'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('projects_owner_id_idx').on(table.ownerId),
    index('projects_created_at_idx').on(table.createdAt),
    index('projects_is_archived_idx').on(table.isArchived),
  ],
);
