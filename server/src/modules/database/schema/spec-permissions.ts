import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';

export const specPermissions = pgTable(
  'spec_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    specId: varchar('spec_id', { length: 100 }).notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id),
    permissionLevel: varchar('permission_level', { length: 20 })
      .notNull()
      .default('full'),
    encryptionToken: text('encryption_token'),
    summaryText: text('summary_text'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('spec_permissions_spec_project_uniq').on(
      table.specId,
      table.projectId,
    ),
  ],
);
