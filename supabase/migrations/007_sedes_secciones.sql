-- Migration 007: Sedes (sites) and Secciones (sections within a site)
-- Multi-site auditing: each tenant has many sedes, each sede has many
-- secciones. Audit sessions reference both; `bodega` stays as the
-- denormalized display label ("Sede · Sección") for backward compat.

-- ================================================================
-- Sedes (physical locations / sites, per-tenant)
-- ================================================================
CREATE TABLE sedes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  nombre      text        NOT NULL,
  direccion   text,
  estado      text        NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'inactivo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);

CREATE INDEX sedes_tenant_idx ON sedes (tenant_id, estado);

-- ================================================================
-- Secciones (areas within a sede: cámara fría, almacén seco, etc.)
-- ================================================================
CREATE TABLE secciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  sede_id     uuid        NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  estado      text        NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'inactivo')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sede_id, nombre)
);

CREATE INDEX secciones_tenant_idx ON secciones (tenant_id);
CREATE INDEX secciones_sede_idx   ON secciones (sede_id, estado);

-- ================================================================
-- Link audit_sessions to sede + seccion (nullable for legacy rows)
-- ================================================================
ALTER TABLE audit_sessions
  ADD COLUMN sede_id    uuid REFERENCES sedes(id),
  ADD COLUMN seccion_id uuid REFERENCES secciones(id);

-- ================================================================
-- RLS — read for whole tenant, writes admin-only
-- ================================================================
ALTER TABLE sedes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE secciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sedes_select" ON sedes
  FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "sedes_insert" ON sedes
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "sedes_update" ON sedes
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "sedes_delete" ON sedes
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

CREATE POLICY "secciones_select" ON secciones
  FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "secciones_insert" ON secciones
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "secciones_update" ON secciones
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
CREATE POLICY "secciones_delete" ON secciones
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

-- ================================================================
-- Fix: allow admin to DELETE products (catalog delete button)
-- RLS had no DELETE policy, so deletes were silently denied.
-- ================================================================
CREATE POLICY "products_delete" ON products
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');
