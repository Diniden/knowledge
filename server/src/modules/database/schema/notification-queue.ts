import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { projects } from './projects.js';

export const notificationQueue = pgTable(
  'notification_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    payloadJson: jsonb('payload_json'),
    read: boolean('read').notNull().default(false),
    dismissed: boolean('dismissed').notNull().default(false),
    sourceUserId: uuid('source_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('notification_queue_user_id_idx').on(table.userId),
    index('notification_queue_user_read_idx').on(table.userId, table.read),
    index('notification_queue_created_at_idx').on(table.createdAt),
    index('notification_queue_type_idx').on(table.type),
  ],
);
