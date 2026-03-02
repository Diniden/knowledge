import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';

export const generatedUiRegistry = pgTable('generated_ui_registry', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  specIds: text('spec_ids').array(),
  uiPath: text('ui_path'),
  uiType: varchar('ui_type', { length: 30 }),
  displayName: varchar('display_name', { length: 100 }),
  parametersJson: jsonb('parameters_json'),
  buildStatus: varchar('build_status', { length: 20 })
    .notNull()
    .default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
