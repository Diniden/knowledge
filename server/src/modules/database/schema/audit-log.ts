import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { projects } from './projects.js';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: varchar('entity_id', { length: 100 }),
    detailsJson: jsonb('details_json'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_log_user_id_idx').on(table.userId),
    index('audit_log_project_id_idx').on(table.projectId),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_entity_type_idx').on(table.entityType),
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_project_created_idx').on(table.projectId, table.createdAt),
    index('audit_log_entity_type_id_idx').on(table.entityType, table.entityId),
  ],
);
