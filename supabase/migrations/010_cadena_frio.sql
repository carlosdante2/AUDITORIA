-- Migration 010 (idempotente): Cadena de frío — Fase 2
-- Equipos (cámaras/neveras) + lecturas de temperatura. Habilita las reglas
-- TEMPERATURA y LECTURA_VENCIDA (el enum tipo_regla ya las incluye desde 009).
-- Los lotes se ubican en un equipo (lotes.equipo_id).

-- ================================================================
-- Equipos (cámaras, neveras, vitrinas, almacén seco) por tenant
-- ================================================================
CREATE TABLE IF NOT EXISTS equipos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  codigo      text NOT NULL,
  tipo        text NOT NULL
              CHECK (tipo IN ('CAMARA_REFRIG','CAMARA_CONGEL','NEVERA','VITRINA','ALMACEN_SECO')),
  ubicacion   text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS equipos_tenant_idx ON equipos (tenant_id, activo);

-- ================================================================
-- Lecturas de temperatura (log inmutable, HORA DE SERVIDOR)
-- ================================================================
CREATE TABLE IF NOT EXISTS lecturas_temperatura (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  equipo_id     uuid NOT NULL REFERENCES equipos(id),
  valor_c       numeric(6,2) NOT NULL,
  registrado_en timestamptz NOT NULL DEFAULT now(),  -- servidor, no cliente
  usuario_id    uuid REFERENCES profiles(id),
  evidencia_url text,
  evidencia_hash text
);
CREATE INDEX IF NOT EXISTS lecturas_equipo_fecha_idx ON lecturas_temperatura (equipo_id, registrado_en DESC);

-- ================================================================
-- Ubicar el lote en un equipo (para TEMPERATURA / LECTURA_VENCIDA)
-- ================================================================
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS equipo_id uuid REFERENCES equipos(id);

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE equipos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas_temperatura ENABLE ROW LEVEL SECURITY;

-- equipos: lectura tenant, escritura admin
DROP POLICY IF EXISTS "equipos_select" ON equipos;
DROP POLICY IF EXISTS "equipos_write"  ON equipos;
CREATE POLICY "equipos_select" ON equipos FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "equipos_write"  ON equipos FOR ALL
  USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin')
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

-- lecturas: lectura tenant, INSERT roles operativos (log inmutable: sin update/delete)
DROP POLICY IF EXISTS "lecturas_select" ON lecturas_temperatura;
DROP POLICY IF EXISTS "lecturas_insert" ON lecturas_temperatura;
CREATE POLICY "lecturas_select" ON lecturas_temperatura FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "lecturas_insert" ON lecturas_temperatura FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() IN ('auditor','supervisor','admin'));
