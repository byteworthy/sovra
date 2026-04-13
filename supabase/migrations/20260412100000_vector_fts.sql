-- Add FTS tsvector column for hybrid search
ALTER TABLE vector_documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_vector_documents_fts
  ON vector_documents USING gin(fts);

-- NOTE: ef_search tuning is handled at connection level, not via ALTER SYSTEM
-- (ALTER SYSTEM cannot run inside migration pipelines).
-- Set in supabase/config.toml or per-session: SET hnsw.ef_search = 100;

-- RPC function: semantic search (cosine similarity via pgvector)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  filter_tenant_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE(id uuid, content text, metadata jsonb, similarity float8)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vd.id,
    vd.content,
    vd.metadata,
    1 - (vd.embedding <=> query_embedding) AS similarity
  FROM public.vector_documents vd
  WHERE vd.tenant_id = filter_tenant_id
  ORDER BY vd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC function: hybrid search (RRF fusion of semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search_documents(
  query_embedding vector(1536),
  query_text text,
  filter_tenant_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE(id uuid, content text, metadata jsonb, score float8)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT vd.id,
           ROW_NUMBER() OVER (ORDER BY vd.embedding <=> query_embedding) AS rank
    FROM public.vector_documents vd
    WHERE vd.tenant_id = filter_tenant_id
    LIMIT 60
  ),
  keyword AS (
    SELECT vd.id,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(vd.fts, plainto_tsquery('english', query_text)) DESC
           ) AS rank
    FROM public.vector_documents vd
    WHERE vd.tenant_id = filter_tenant_id
      AND vd.fts @@ plainto_tsquery('english', query_text)
    LIMIT 60
  ),
  rrf AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT vd.id, vd.content, vd.metadata, rrf.score
  FROM rrf
  JOIN public.vector_documents vd ON vd.id = rrf.id
  ORDER BY rrf.score DESC
  LIMIT match_count;
END;
$$;
