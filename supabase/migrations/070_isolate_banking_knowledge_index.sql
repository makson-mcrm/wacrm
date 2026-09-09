-- M4 Package 2: keep confidential Drive knowledge out of the global CRM search.
-- This changes only the two read functions; no customer row is modified.

CREATE OR REPLACE FUNCTION public.match_ai_knowledge_fts(
  p_account_id uuid,
  p_query text,
  p_match_count integer
)
RETURNS TABLE (id uuid, content text, rank real) AS $$
  SELECT c.id,
         c.content,
         ts_rank(c.fts, plainto_tsquery('simple', p_query)) AS rank
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_documents d
    ON d.id = c.document_id
   AND d.account_id = c.account_id
  WHERE c.account_id = p_account_id
    AND COALESCE(d.document_type, '') NOT LIKE 'google_drive_internal%'
    AND c.fts @@ plainto_tsquery('simple', p_query)
  ORDER BY rank DESC
  LIMIT GREATEST(p_match_count, 0);
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION public.match_ai_knowledge_semantic(
  p_account_id uuid,
  p_query_embedding text,
  p_match_count integer
)
RETURNS TABLE (id uuid, content text, distance real) AS $$
  SELECT c.id,
         c.content,
         (c.embedding <=> p_query_embedding::vector(1536)) AS distance
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_documents d
    ON d.id = c.document_id
   AND d.account_id = c.account_id
  WHERE c.account_id = p_account_id
    AND COALESCE(d.document_type, '') NOT LIKE 'google_drive_internal%'
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> p_query_embedding::vector(1536)
  LIMIT GREATEST(p_match_count, 0);
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

REVOKE ALL ON FUNCTION public.match_ai_knowledge_fts(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge_fts(uuid, text, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.match_ai_knowledge_semantic(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge_semantic(uuid, text, integer) TO authenticated, service_role;

