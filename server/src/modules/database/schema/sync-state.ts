import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';

export const syncState = pgTable(
  'sync_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    branchName: varchar('branch_name', { length: 255 })
      .notNull()
      .default('main'),
    lastPullHash: varchar('last_pull_hash', { length: 40 }),
    lastPushHash: varchar('last_push_hash', { length: 40 }),
    syncStatus: varchar('sync_status', { length: 20 })
      .notNull()
      .default('synced'),
    conflictDetailsJson: jsonb('conflict_details_json'),
    lastSyncError: text('last_sync_error'),
    lastSyncErrorAt: timestamp('last_sync_error_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('sync_state_project_user_branch_uniq').on(
      table.projectId,
      table.userId,
      table.branchName,
    ),
  ],
);
