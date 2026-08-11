-- Migration 001: Initial schema — tenants, sectors, profiles, products
-- AuditorIA PWA — Multi-tenant inventory auditing

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- Sectors (shared config, not tenant-scoped)
-- ================================================================
CREATE TABLE sectors (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL UNIQUE,
  semaforo_config jsonb   NOT NULL DEFAULT '{}',
  prompt_ia   text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- Tenants (one row per hotel/company)
-- ================================================================
CREATE TABLE tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  sector_id   uuid        NOT NULL REFERENCES sectors(id),
  plan        text        NOT NULL DEFAULT 'free',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- Profiles (extends auth.users — display data only)
-- Roles live in auth.users.app_metadata, NOT here
-- ================================================================
CREATE TABLE profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  nombre      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- Products catalog (per-tenant, with pgvector embeddings)
-- ================================================================
CREATE TABLE products (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid        NOT NULL REFERENCES tenants(id),
  nombre                    text        NOT NULL,
  unidad_medida             text        NOT NULL,
  subtipo                   text        NOT NULL,
  requiere_fecha_vencimiento boolean    NOT NULL DEFAULT true,
  embedding                 vector(1536),
  estado                    text        NOT NULL DEFAULT 'activo'
                            CHECK (estado IN ('activo', 'inactivo')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  -- Same product in different presentations = different entries
  UNIQUE (tenant_id, nombre, unidad_medida)
);

-- IVFFlat index for cosine similarity search (optimal for ≤500 products/tenant)
CREATE INDEX products_embedding_idx
  ON products USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX products_tenant_estado_idx ON products (tenant_id, estado);

-- updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
