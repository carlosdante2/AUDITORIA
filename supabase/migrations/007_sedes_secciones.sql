-- Migration 007 (idempotente): Sedes y Secciones
-- Multi-site auditing: cada tenant tiene varias sedes, cada sede varias
-- secciones. Las sesiones de auditoría referencian ambas; `bodega` queda
-- como etiqueta denormalizada ("Sede · Sección") por compatibilidad.
-- Seguro de correr varias veces (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ================================================================
-- Sedes (ubicaciones físicas / almacenes, por tenant)
-- ================================================================
CREATE TABLE IF NOT EXISTS sedes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  nombre      text        NOT NULL,
  direccion   text,
  estado      text        NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'inactivo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX IF NOT EXISTS sedes_tenant_idx ON sedes (tenant_id, estado);

-- ================================================================
-- Secciones (áreas dentro de una sede: cámara fría, almacén seco…)
-- ================================================================
CREATE TABLE IF NOT EXISTS secciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  sede_id     uuid        NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  estado      text        NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'inactivo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sede_id, nombre)
);
CREATE INDEX IF NOT EXISTS secciones_tenant_idx ON secciones (tenant_id);
CREATE INDEX IF NOT EXISTS secciones_sede_idx   ON secciones (sede_id, estado);

-- ================================================================
-- Vincular audit_sessions a sede + seccion (nullable para filas viejas)
-- ================================================================
ALTER TABLE audit_sessions ADD COLUMN IF NOT EXISTS sede_id    uuid REFERENCES sedes(id);
ALTER TABLE audit_sessions ADD COLUMN IF NOT EXISTS seccion_id uuid REFERENCES secciones(id);

-- ================================================================
-- RLS — lectura para todo el tenant, escritura solo admin
-- ================================================================
ALTER TABLE sedes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE secciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sedes_select" ON sedes;
DROP POLICY IF EXISTS "sedes_insert" ON sedes;
DROP POLICY IF EXISTS "sedes_update" ON sedes;
DROP POLICY IF EXISTS "sedes_delete" ON sedes;
CREATE POLICY "sedes_select" ON sedes FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "sedes_insert" ON sedes FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "sedes_update" ON sedes FOR UPDATE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "sedes_delete" ON sedes FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

DROP POLICY IF EXISTS "secciones_select" ON secciones;
DROP POLICY IF EXISTS "secciones_insert" ON secciones;
DROP POLICY IF EXISTS "secciones_update" ON secciones;
DROP POLICY IF EXISTS "secciones_delete" ON secciones;
CREATE POLICY "secciones_select" ON secciones FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "secciones_insert" ON secciones FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "secciones_update" ON secciones FOR UPDATE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "secciones_delete" ON secciones FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

-- ================================================================
-- Fix: permitir a admin ELIMINAR productos (botón del catálogo)
-- RLS no tenía política DELETE, así que los borrados se denegaban.
-- ================================================================
DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
