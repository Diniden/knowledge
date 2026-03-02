import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { projects } from './projects.js';

export const agentSessions = pgTable(
  'agent_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    sessionType: varchar('session_type', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    contextJson: jsonb('context_json'),
    tokenUsage: integer('token_usage').notNull().default(0),
    errorMessage: text('error_message'),
    parentSessionId: uuid('parent_session_id'),
  },
  (table) => [
    index('agent_sessions_user_id_idx').on(table.userId),
    index('agent_sessions_project_id_idx').on(table.projectId),
    index('agent_sessions_status_idx').on(table.status),
    index('agent_sessions_started_at_idx').on(table.startedAt),
  ],
);
