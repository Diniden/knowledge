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
import { agentSessions } from './agent-sessions.js';

export const agentMessages = pgTable(
  'agent_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => agentSessions.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    metadataJson: jsonb('metadata_json'),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('agent_messages_session_id_idx').on(table.sessionId),
    index('agent_messages_created_at_idx').on(table.createdAt),
    index('agent_messages_session_created_idx').on(
      table.sessionId,
      table.createdAt,
    ),
  ],
);
