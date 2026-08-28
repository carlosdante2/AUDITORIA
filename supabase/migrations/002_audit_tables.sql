-- Migration 002: Audit sessions and product counts
-- Fresko PWA — Core auditing tables

-- ================================================================
-- Audit Sessions (one per bodega/area per audit cycle)
-- ================================================================
CREATE TABLE audit_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id),
  bodega        text        NOT NULL,
  estado        text        NOT NULL DEFAULT 'abierta'
                            CHECK (estado IN ('abierta', 'cerrada')),
  supervisor_id uuid        REFERENCES profiles(id),
  insights_ia   text,
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);

CREATE INDEX audit_sessions_tenant_idx ON audit_sessions (tenant_id, estado);

-- ================================================================
-- Product Counts (individual audit records within a session)
-- local_id: UUID generated client-side for offline dedup
-- ================================================================
CREATE TABLE product_counts (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id                     uuid        NOT NULL UNIQUE,  -- dedup key
  session_id                   uuid        NOT NULL REFERENCES audit_sessions(id),
  tenant_id                    uuid        NOT NULL REFERENCES tenants(id),
  producto_id                  uuid        NOT NULL REFERENCES products(id),
  cantidad                     numeric(10,3) NOT NULL CHECK (cantidad >= 0),
  unidad_medida                text        NOT NULL,
  fecha_vencimiento            date,
  fecha_recepcion_o_compra     date,
  estado_empaque               text        NOT NULL
                               CHECK (estado_empaque IN ('intacto', 'dano_leve', 'roto_abierto_fuga')),
  observacion_visual           text        NOT NULL
                               CHECK (observacion_visual IN ('normal', 'dudoso', 'no_conforme')),
  foto_evidencia_url           text,
  semaforo_color               text        NOT NULL
                               CHECK (semaforo_color IN ('verde', 'amarillo', 'rojo')),
  semaforo_razon               text        NOT NULL,
  semaforo_accion              text        NOT NULL,
  semaforo_estrategia_circular text,
  semaforo_ods                 text[]      NOT NULL DEFAULT '{}',
  semaforo_metodo_calculo      text        NOT NULL
                               CHECK (semaforo_metodo_calculo IN ('fecha_documentada', 'estimado_por_recepcion', 'no_aplica')),
  dias_restantes               integer,
  transcripcion_voz            text,
  captura_metodo               text        NOT NULL DEFAULT 'manual'
                               CHECK (captura_metodo IN ('voz', 'manual')),
  sincronizado                 boolean     NOT NULL DEFAULT false,
  created_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_counts_session_idx   ON product_counts (session_id);
CREATE INDEX product_counts_tenant_idx    ON product_counts (tenant_id);
CREATE INDEX product_counts_semaforo_idx  ON product_counts (tenant_id, semaforo_color);
CREATE INDEX product_counts_sync_idx      ON product_counts (tenant_id, sincronizado)
  WHERE sincronizado = false;
