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
import { agentSessions } from './agent-sessions.js';

export const planExecutions = pgTable('plan_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  planPath: text('plan_path'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  resultJson: jsonb('result_json'),
  errorMessage: text('error_message'),
  triggeredByUserId: uuid('triggered_by_user_id')
    .notNull()
    .references(() => users.id),
  agentSessionId: uuid('agent_session_id').references(() => agentSessions.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
