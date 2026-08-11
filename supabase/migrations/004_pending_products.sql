-- Migration 004: Pending products — detected but not yet approved

-- ================================================================
-- Pending Products
-- Products from invoices or manual input awaiting Admin/Supervisor approval.
-- Constitution Principle VII: NO product enters catalog without approval.
-- ================================================================
CREATE TABLE pending_products (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenants(id),
  nombre_sugerido      text        NOT NULL,
  unidad_sugerida      text        NOT NULL,
  subtipo_sugerido     text,
  origen               text        NOT NULL
                       CHECK (origen IN ('factura', 'manual')),
  recepcion_item_id    uuid        REFERENCES reception_items(id),
  -- top-3 catalog candidates with cosine scores (JSONB for flexibility)
  match_candidates     jsonb,
  aprobado_por         uuid        REFERENCES profiles(id),
  producto_aprobado_id uuid        REFERENCES products(id),
  estado               text        NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pending_products_tenant_estado_idx ON pending_products (tenant_id, estado);
