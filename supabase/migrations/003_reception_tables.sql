-- Migration 003: Reception tables — mercadería nueva por foto de factura

-- ================================================================
-- Receptions (invoice-based goods reception events)
-- ================================================================
CREATE TABLE receptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id),
  auditor_id      uuid        NOT NULL REFERENCES profiles(id),
  proveedor       text,
  foto_factura_url text,
  estado          text        NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador', 'confirmada', 'con_pendientes')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz
);

CREATE INDEX receptions_tenant_idx ON receptions (tenant_id, estado);

-- ================================================================
-- Reception Items (one row per product line in the invoice)
-- producto_id is NULL when no catalog match found
-- ================================================================
CREATE TABLE reception_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id         uuid        NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  tenant_id            uuid        NOT NULL REFERENCES tenants(id),
  producto_id          uuid        REFERENCES products(id),
  descripcion_extraida text        NOT NULL,
  cantidad             numeric(10,3),
  precio_unitario      numeric(12,2),
  match_score          numeric(4,3),
  estado               text        NOT NULL DEFAULT 'confirmado'
                       CHECK (estado IN ('confirmado', 'corregido', 'pendiente_aprobacion')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reception_items_reception_idx ON reception_items (reception_id);
CREATE INDEX reception_items_tenant_idx    ON reception_items (tenant_id, estado);
