import {
  pgTable,
  varchar,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const embeddings = pgTable(
  'embeddings',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    specId: varchar('spec_id', { length: 36 }).notNull(),
    documentId: varchar('document_id', { length: 36 }).notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    chunkText: text('chunk_text').notNull(),
    metadata: jsonb('metadata').$type<{
      title?: string;
      section?: string;
      wordCount: number;
      specStatus?: string;
    }>(),
    modelName: varchar('model_name', { length: 100 }).notNull(),
    dimensions: integer('dimensions').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('embeddings_spec_id_idx').on(table.specId),
    index('embeddings_document_id_idx').on(table.documentId),
  ],
);
