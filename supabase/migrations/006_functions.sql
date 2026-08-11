-- Migration 006: SECURITY DEFINER functions + RPC for pgvector

-- ================================================================
-- get_my_tenant_id()
-- Reads tenant_id from JWT app_metadata (only SERVICE_ROLE_KEY can write it)
-- SECURITY DEFINER: executes with function owner privileges
-- Constitution III: NEVER read from user_metadata
-- ================================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

-- ================================================================
-- get_my_rol()
-- Reads rol from JWT app_metadata
-- ================================================================
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$;

-- ================================================================
-- match_products()
-- pgvector cosine similarity search scoped to caller's tenant via RLS
-- Called from /api/match Next.js Route Handler
-- ================================================================
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.70,
  match_count     int   DEFAULT 3
)
RETURNS TABLE (
  id                        uuid,
  nombre                    text,
  unidad_medida             text,
  subtipo                   text,
  requiere_fecha_vencimiento boolean,
  similarity                float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.nombre,
    p.unidad_medida,
    p.subtipo,
    p.requiere_fecha_vencimiento,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM products p
  WHERE
    p.tenant_id = get_my_tenant_id()
    AND p.estado = 'activo'
    AND p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
