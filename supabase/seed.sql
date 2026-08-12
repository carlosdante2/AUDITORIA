-- Seed: AuditorIA test data
-- NOTE: Auth users (profiles) must be created via Supabase Dashboard or Auth API.
-- This seed creates base config + 2 tenants + 10 sample products.

-- ================================================================
-- Sector: Alimentos y Bebidas (INVIMA Colombia)
-- ================================================================
INSERT INTO sectors (id, nombre, semaforo_config, prompt_ia)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'alimentos_bebidas',
  '{
    "subtipos": {
      "carne_res":        {"vid_estimada_dias": 3,  "alerta_amarilla_dias": 1},
      "carne_cerdo":      {"vid_estimada_dias": 3,  "alerta_amarilla_dias": 1},
      "pollo":            {"vid_estimada_dias": 2,  "alerta_amarilla_dias": 1},
      "pescado":          {"vid_estimada_dias": 2,  "alerta_amarilla_dias": 1},
      "lacteo":           {"vid_estimada_dias": 7,  "alerta_amarilla_dias": 2},
      "huevo":            {"vid_estimada_dias": 21, "alerta_amarilla_dias": 5},
      "frutas_verduras":  {"vid_estimada_dias": 5,  "alerta_amarilla_dias": 2},
      "preparado_cocina": {"vid_estimada_dias": 1,  "alerta_amarilla_dias": 0},
      "enlatado":         {"vid_estimada_dias": null,"alerta_amarilla_dias": 30},
      "granos_secos":     {"vid_estimada_dias": null,"alerta_amarilla_dias": 60},
      "bebida":           {"vid_estimada_dias": null,"alerta_amarilla_dias": 30},
      "aceite_grasa":     {"vid_estimada_dias": null,"alerta_amarilla_dias": 30}
    }
  }',
  'Eres un experto en inocuidad alimentaria (INVIMA Colombia). Genera un resumen ejecutivo conciso de la sesión de auditoría, enfocado en acciones inmediatas. Responde en español, máximo 3 oraciones.'
)
ON CONFLICT (nombre) DO NOTHING;

-- ================================================================
-- Test Tenant A: Hotel Las Palmas
-- ================================================================
INSERT INTO tenants (id, nombre, sector_id, plan)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Hotel Las Palmas',
  '00000000-0000-0000-0000-000000000001',
  'pro'
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- Test Tenant B: Hotel Caribe (for isolation testing)
-- ================================================================
INSERT INTO tenants (id, nombre, sector_id, plan)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'Hotel Caribe',
  '00000000-0000-0000-0000-000000000001',
  'free'
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- Sample products for Tenant A
-- Embeddings are NULL — generated automatically on first use via Edge Function
-- ================================================================
INSERT INTO products (tenant_id, nombre, unidad_medida, subtipo, requiere_fecha_vencimiento)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Carne de res lomo',   'kg',       'carne_res',       true),
  ('10000000-0000-0000-0000-000000000001', 'Carne de res molida', 'kg',       'carne_res',       true),
  ('10000000-0000-0000-0000-000000000001', 'Pechuga de pollo',    'kg',       'pollo',           true),
  ('10000000-0000-0000-0000-000000000001', 'Filete de tilapia',   'kg',       'pescado',         true),
  ('10000000-0000-0000-0000-000000000001', 'Leche entera',        'litros',   'lacteo',          true),
  ('10000000-0000-0000-0000-000000000001', 'Queso costeño',       'kg',       'lacteo',          true),
  ('10000000-0000-0000-0000-000000000001', 'Huevos AA',           'unidades', 'huevo',           false),
  ('10000000-0000-0000-0000-000000000001', 'Tomate chonto',       'kg',       'frutas_verduras', false),
  ('10000000-0000-0000-0000-000000000001', 'Arroz blanco extra',  'kg',       'granos_secos',    false),
  ('10000000-0000-0000-0000-000000000001', 'Aceite vegetal',      'litros',   'aceite_grasa',    true),
  ('10000000-0000-0000-0000-000000000001', 'Atún en lata',        'unidades', 'enlatado',        true),
  ('10000000-0000-0000-0000-000000000001', 'Agua mineral 500ml',  'unidades', 'bebida',          true)
ON CONFLICT (tenant_id, nombre, unidad_medida) DO NOTHING;

-- ================================================================
-- Reglas demo del semáforo configurable (Tenant A) — GLOBAL
-- ================================================================
-- Reemplazan el comportamiento del motor cableado eliminado. El admin puede
-- editarlas/ampliarlas por categoría o producto desde /admin/reglas.
-- Requiere migraciones 009–012 aplicadas (incl. estrategia_circular).
-- creado_por = NULL (seed sin usuario); ids fijos para idempotencia.
-- TEMPERATURA/LECTURA_VENCIDA se dejan al admin (dependen de equipos/lecturas).

-- 1) VENCIMIENTO (con rutas de valorización → ODS derivados en la UI)
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        'VENCIMIENTO', 'GLOBAL', NULL, 'Vencimiento estándar', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_min, valor_max, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, 'VERDE',   'GT',      15::numeric, NULL::numeric, 'dias', 'SOLO_ALERTA',   NULL,                                       0, NULL::text),
  ('20000000-0000-0000-0000-000000000001'::uuid, 'AMARILLO','BETWEEN',  7::numeric, 15::numeric,   'dias', 'SOLO_ALERTA',   'Por vencer: priorizar uso interno',        1, 'REDISTRIBUCION_INTERNA'),
  ('20000000-0000-0000-0000-000000000001'::uuid, 'NARANJA', 'BETWEEN',  1::numeric,  6::numeric,   'dias', 'SOLO_ALERTA',   'Vence pronto: derivar a banco de alimentos', 2, 'BANCO_ALIMENTOS'),
  ('20000000-0000-0000-0000-000000000001'::uuid, 'ROJO',    'LTE',     NULL::numeric, 0::numeric,  'dias', 'BLOQUEA_SALIDA','Vencido: retirar del consumo',             3, 'COMPOSTAJE')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000001');

-- 2) TRAZABILIDAD (campos obligatorios del lote)
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
        'TRAZABILIDAD', 'GLOBAL', NULL, 'Campos obligatorios', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_min, valor_max, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000002'::uuid, 'VERDE', 'EQ',  0::numeric, NULL::numeric, '-', 'SOLO_ALERTA',    NULL,                                                 0, NULL::text),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'ROJO',  'GTE', 1::numeric, NULL::numeric, '-', 'BLOQUEA_INGRESO','Lote sin código, proveedor o fecha de vencimiento', 1, NULL::text)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000002');

-- 3) CUARENTENA (empaque/observación del auditor → estado_cuarentena)
--    Restaura "empaque roto → ROJO" del motor viejo, ahora configurable.
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
        'CUARENTENA', 'GLOBAL', NULL, 'Estado de cuarentena', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_text, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000003'::uuid, 'VERDE',    'EQ', 'LIBRE',         '-', 'SOLO_ALERTA',    NULL,                                             0, NULL::text),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'AMARILLO', 'EQ', 'EN_EVALUACION', '-', 'SOLO_ALERTA',    'Daño leve / observación dudosa: revisar',        1, NULL::text),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'ROJO',     'EQ', 'NO_CONFORME',   '-', 'BLOQUEA_SALIDA', 'Empaque roto / no conforme: retirar del consumo', 2, 'DISPOSICION_CONTROLADA')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000003');
