CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id VARCHAR(36) PRIMARY KEY,
  spec_id VARCHAR(36) NOT NULL,
  document_id VARCHAR(36) NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  model_name VARCHAR(100) NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 768,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embeddings_spec_id_idx ON embeddings(spec_id);
CREATE INDEX IF NOT EXISTS embeddings_document_id_idx ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
