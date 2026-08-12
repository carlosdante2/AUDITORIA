-- Migration 009 (idempotente): Motor de Semáforo Sanitario Configurable — Fase 1
-- Cero umbrales hardcodeados: todo vive en `reglas` + `regla_umbrales`.
-- Fase 1 evalúa VENCIMIENTO, TRAZABILIDAD, CUARENTENA, STOCK_MINIMO.
-- (TEMPERATURA / LECTURA_VENCIDA quedan para Fase 2; el enum ya los incluye.)
-- tenant_id referencia tenants(id) — el "hotel" del spec.

-- ================================================================
-- Enums
-- ================================================================
DO $$ BEGIN
  CREATE TYPE tipo_regla AS ENUM (
    'VENCIMIENTO','POST_APERTURA','TEMPERATURA','LECTURA_VENCIDA',
    'TRAZABILIDAD','CUARENTENA','STOCK_MINIMO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ambito_regla AS ENUM ('GLOBAL','CATEGORIA','PRODUCTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE color_semaforo AS ENUM ('VERDE','AMARILLO','NARANJA','ROJO','GRIS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE accion_regla AS ENUM (
    'SOLO_ALERTA','BLOQUEA_SALIDA','BLOQUEA_INGRESO','FUERZA_CUARENTENA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- Categorías (jerárquicas, por tenant)
-- ================================================================
CREATE TABLE IF NOT EXISTS categorias (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  nombre     text NOT NULL,
  parent_id  uuid REFERENCES categorias(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
CREATE INDEX IF NOT EXISTS categorias_tenant_idx ON categorias (tenant_id);

-- Atributos sanitarios del producto (los define el admin, no vienen precargados)
ALTER TABLE products ADD COLUMN IF NOT EXISTS categoria_id           uuid REFERENCES categorias(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS es_crudo               boolean;
ALTER TABLE products ADD COLUMN IF NOT EXISTS es_listo_consumo       boolean;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condicion_conservacion text; -- SECO|REFRIGERADO|CONGELADO

-- ================================================================
-- Lotes (entidad de trazabilidad de primera clase)
-- ================================================================
CREATE TABLE IF NOT EXISTS lotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  producto_id       uuid NOT NULL REFERENCES products(id),
  codigo_lote       text,
  proveedor_id      uuid,
  ubicacion_id      uuid,
  cantidad          numeric(14,3) NOT NULL DEFAULT 0,
  fecha_recepcion   timestamptz NOT NULL DEFAULT now(),
  fecha_produccion  date,
  fecha_vencimiento date,
  fecha_apertura    timestamptz,
  estado_cuarentena text NOT NULL DEFAULT 'LIBRE'
                    CHECK (estado_cuarentena IN ('LIBRE','EN_EVALUACION','NO_CONFORME','LIBERADO')),
  activo            boolean NOT NULL DEFAULT true,
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lotes_tenant_idx    ON lotes (tenant_id, activo);
CREATE INDEX IF NOT EXISTS lotes_producto_idx  ON lotes (producto_id);

-- ================================================================
-- Reglas (versionadas) + umbrales
-- ================================================================
CREATE TABLE IF NOT EXISTS reglas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  tipo          tipo_regla   NOT NULL,
  ambito        ambito_regla NOT NULL,
  ambito_id     uuid,
  nombre        text NOT NULL,
  activa        boolean NOT NULL DEFAULT true,
  version       int NOT NULL DEFAULT 1,
  vigente_desde timestamptz NOT NULL DEFAULT now(),
  vigente_hasta timestamptz,
  creado_por    uuid REFERENCES profiles(id),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ambito_coherente CHECK (
    (ambito = 'GLOBAL' AND ambito_id IS NULL) OR
    (ambito <> 'GLOBAL' AND ambito_id IS NOT NULL)
  )
);

-- Una sola regla vigente por (tenant, tipo, ambito, ambito_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_regla_vigente
  ON reglas (tenant_id, tipo, ambito, COALESCE(ambito_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE vigente_hasta IS NULL AND activa;

CREATE TABLE IF NOT EXISTS regla_umbrales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regla_id   uuid NOT NULL REFERENCES reglas(id) ON DELETE CASCADE,
  color      color_semaforo NOT NULL,
  operador   text NOT NULL,   -- GT|GTE|LT|LTE|BETWEEN|EQ|IS_NULL|IN
  valor_min  numeric,
  valor_max  numeric,
  valor_text text,
  unidad     text,            -- dias|horas|celsius|porcentaje|-
  accion     accion_regla NOT NULL DEFAULT 'SOLO_ALERTA',
  mensaje    text,
  orden      int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS regla_umbrales_regla_idx ON regla_umbrales (regla_id);

-- ================================================================
-- Estado evaluado (materializado) por lote
-- ================================================================
CREATE TABLE IF NOT EXISTS lote_estado (
  lote_id         uuid PRIMARY KEY REFERENCES lotes(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  color           color_semaforo NOT NULL,
  evaluado_en     timestamptz NOT NULL DEFAULT now(),
  detalle         jsonb NOT NULL DEFAULT '[]',
  bloqueo_salida  boolean NOT NULL DEFAULT false,
  bloqueo_ingreso boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS lote_estado_color_idx ON lote_estado (tenant_id, color);

-- ================================================================
-- Alertas (versión de regla congelada — auditable, nunca se recalcula)
-- ================================================================
CREATE TABLE IF NOT EXISTS alertas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  lote_id        uuid REFERENCES lotes(id),
  regla_id       uuid NOT NULL,
  regla_version  int  NOT NULL,
  umbral_snapshot jsonb NOT NULL,
  color          color_semaforo NOT NULL,
  valor_evaluado numeric,
  mensaje        text NOT NULL,
  estado         text NOT NULL DEFAULT 'ABIERTA'
                 CHECK (estado IN ('ABIERTA','RECONOCIDA','CERRADA')),
  creada_en      timestamptz NOT NULL DEFAULT now(),
  reconocida_por uuid REFERENCES profiles(id),
  cerrada_en     timestamptz
);
CREATE INDEX IF NOT EXISTS alertas_tenant_idx ON alertas (tenant_id, estado, creada_en DESC);

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE categorias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE regla_umbrales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_estado    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas        ENABLE ROW LEVEL SECURITY;

-- categorias: lectura tenant, escritura admin
DROP POLICY IF EXISTS "categorias_select" ON categorias;
DROP POLICY IF EXISTS "categorias_write"  ON categorias;
CREATE POLICY "categorias_select" ON categorias FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "categorias_write"  ON categorias FOR ALL
  USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin')
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

-- lotes: lectura tenant, escritura roles operativos
DROP POLICY IF EXISTS "lotes_select" ON lotes;
DROP POLICY IF EXISTS "lotes_insert" ON lotes;
DROP POLICY IF EXISTS "lotes_update" ON lotes;
CREATE POLICY "lotes_select" ON lotes FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "lotes_insert" ON lotes FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() IN ('auditor','supervisor','admin'));
CREATE POLICY "lotes_update" ON lotes FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND get_my_rol() IN ('auditor','supervisor','admin'));

-- reglas + umbrales: lectura tenant, escritura admin
DROP POLICY IF EXISTS "reglas_select" ON reglas;
DROP POLICY IF EXISTS "reglas_write"  ON reglas;
CREATE POLICY "reglas_select" ON reglas FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "reglas_write"  ON reglas FOR ALL
  USING (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin')
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_rol() = 'admin');

DROP POLICY IF EXISTS "regla_umbrales_select" ON regla_umbrales;
DROP POLICY IF EXISTS "regla_umbrales_write"  ON regla_umbrales;
CREATE POLICY "regla_umbrales_select" ON regla_umbrales FOR SELECT
  USING (EXISTS (SELECT 1 FROM reglas r WHERE r.id = regla_id AND r.tenant_id = get_my_tenant_id()));
CREATE POLICY "regla_umbrales_write" ON regla_umbrales FOR ALL
  USING (get_my_rol() = 'admin' AND EXISTS (SELECT 1 FROM reglas r WHERE r.id = regla_id AND r.tenant_id = get_my_tenant_id()))
  WITH CHECK (get_my_rol() = 'admin' AND EXISTS (SELECT 1 FROM reglas r WHERE r.id = regla_id AND r.tenant_id = get_my_tenant_id()));

-- lote_estado: lectura tenant, escritura tenant (lo materializa el motor server-side)
DROP POLICY IF EXISTS "lote_estado_select" ON lote_estado;
DROP POLICY IF EXISTS "lote_estado_write"  ON lote_estado;
CREATE POLICY "lote_estado_select" ON lote_estado FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "lote_estado_write"  ON lote_estado FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- alertas: lectura tenant, insert tenant, update supervisor/admin (reconocer/cerrar)
DROP POLICY IF EXISTS "alertas_select" ON alertas;
DROP POLICY IF EXISTS "alertas_insert" ON alertas;
DROP POLICY IF EXISTS "alertas_update" ON alertas;
CREATE POLICY "alertas_select" ON alertas FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "alertas_insert" ON alertas FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "alertas_update" ON alertas FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND get_my_rol() IN ('supervisor','admin'));
