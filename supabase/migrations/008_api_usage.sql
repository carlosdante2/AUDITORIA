-- Migration 008 (idempotente): registro de uso de APIs LLM para control de costos
-- Cada llamada a Groq/Jina inserta una fila con tokens/segundos reales y costo
-- estimado (según precios de referencia en lib/costs.ts). Solo admin puede leer.

CREATE TABLE IF NOT EXISTS api_usage (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid          NOT NULL REFERENCES tenants(id),
  service       text          NOT NULL,          -- 'groq' | 'jina'
  model         text          NOT NULL,
  endpoint      text          NOT NULL,          -- 'voz' | 'vision' | 'insights' | 'embeddings' | 'match'
  input_tokens  integer       NOT NULL DEFAULT 0,
  output_tokens integer       NOT NULL DEFAULT 0,
  audio_seconds numeric(10,2) NOT NULL DEFAULT 0,
  cost_usd      numeric(12,6) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_tenant_date_idx ON api_usage (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS api_usage_service_idx     ON api_usage (tenant_id, service, created_at);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro del tenant puede registrar (el server loguea como el usuario que llama)
DROP POLICY IF EXISTS "api_usage_insert" ON api_usage;
CREATE POLICY "api_usage_insert" ON api_usage
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

-- Solo admin puede ver el panel de costos
DROP POLICY IF EXISTS "api_usage_select" ON api_usage;
CREATE POLICY "api_usage_select" ON api_usage
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
