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
  ('20000000-0000-0000-0000-000000000001'::uuid, 'VERDE'::color_semaforo,   'GT',      15::numeric, NULL::numeric, 'dias', 'SOLO_ALERTA'::accion_regla,   NULL,                                       0, NULL::text),
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
  ('20000000-0000-0000-0000-000000000002'::uuid, 'VERDE'::color_semaforo, 'EQ',  0::numeric, NULL::numeric, '-', 'SOLO_ALERTA'::accion_regla,    NULL,                                                 0, NULL::text),
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
  ('20000000-0000-0000-0000-000000000003'::uuid, 'VERDE'::color_semaforo,    'EQ', 'LIBRE',         '-', 'SOLO_ALERTA'::accion_regla,    NULL,                                             0, NULL::text),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'AMARILLO', 'EQ', 'EN_EVALUACION', '-', 'SOLO_ALERTA',    'Daño leve / observación dudosa: revisar',        1, NULL::text),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'ROJO',     'EQ', 'NO_CONFORME',   '-', 'BLOQUEA_SALIDA', 'Empaque roto / no conforme: retirar del consumo', 2, 'DISPOSICION_CONTROLADA')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000003');

-- ================================================================
-- Categorías de ejemplo por nivel de perecibilidad (Tenant A)
-- ================================================================
-- Bloque de Alimentos y Bebidas del anexo Semaforo_actualizado.md §5.1-§5.3.
-- El motor ya resuelve ambito='CATEGORIA' (más específico que la regla GLOBAL de
-- VENCIMIENTO de arriba, que queda como fallback para productos sin categoría).
-- Solo se siembra el bloque de Alimentos: Aseo/Menaje/Suministros dependen de
-- `clase_insumo` (ítem #13) y quedarían vacíos hoy.
-- Orden: categorías ANTES que reglas — el trigger 013 valida que la categoría
-- exista al insertar una regla de ámbito CATEGORIA.
-- Se resuelven por NOMBRE (no por id fijo) para ser idempotente aunque el hotel ya
-- haya creado alguna de estas categorías a mano (con otro id): ON CONFLICT
-- (tenant_id, nombre) las respeta, y reglas/asignaciones buscan el id real vigente.

-- Nivel 1
INSERT INTO categorias (tenant_id, nombre, parent_id)
VALUES ('10000000-0000-0000-0000-000000000001', 'Alimentos y Bebidas', NULL)
ON CONFLICT (tenant_id, nombre) DO NOTHING;

-- Nivel 2 (padre resuelto por nombre)
INSERT INTO categorias (tenant_id, nombre, parent_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Perecederos críticos',    (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Alimentos y Bebidas')),
  ('10000000-0000-0000-0000-000000000001', 'Perecederos intermedios', (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Alimentos y Bebidas')),
  ('10000000-0000-0000-0000-000000000001', 'No perecederos',          (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Alimentos y Bebidas'))
ON CONFLICT (tenant_id, nombre) DO NOTHING;

-- Asignación masiva de los productos de ejemplo por subtipo (§5.2).
-- `lacteo` genérico queda SIN asignar a propósito: mezcla riesgo crítico (leche
-- fresca, queso blanco) con estable (UHT, queso maduro); lo reparte el hotel.
UPDATE products SET categoria_id =
  (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Perecederos críticos')
WHERE tenant_id = '10000000-0000-0000-0000-000000000001'
  AND subtipo IN ('carne_res','carne_cerdo','pollo','pescado','mariscos',
                  'lacteo_fresco','preparado_cocina','fruta_verdura_cortada_o_pelada');

UPDATE products SET categoria_id =
  (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Perecederos intermedios')
WHERE tenant_id = '10000000-0000-0000-0000-000000000001'
  AND subtipo IN ('frutas_verduras','hojas_verdes','hierbas_frescas','tomate','pepino',
                  'pimenton','calabacin','zanahoria','remolacha','papa','cebolla','ajo',
                  'banano','citricos','manzana','pera','mango','papaya','pina','berries',
                  'aguacate','huevo','panaderia','panaderia_vida_corta',
                  'bebida_refrigerada','jugos_refrigerados');

UPDATE products SET categoria_id =
  (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'No perecederos')
WHERE tenant_id = '10000000-0000-0000-0000-000000000001'
  AND subtipo IN ('granos_secos','enlatado','conserva','aceite_grasa','galletas_cereales',
                  'leche_en_polvo','cafe_te','azucar_sal','bebida','bebida_estable',
                  'agua','hielo_empaquetado');

-- ================================================================
-- Reglas VENCIMIENTO por categoría (§5.3) — 4 colores, sin huecos ni solapes
-- ================================================================
-- 1.1 Perecederos críticos: VERDE >5 · AMARILLO 3-5 · NARANJA 1-2 · ROJO ≤0
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
        'VENCIMIENTO', 'CATEGORIA',
        (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Perecederos críticos'),
        'Vencimiento — perecederos críticos', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_min, valor_max, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000011'::uuid, 'VERDE'::color_semaforo,   'GT',      5::numeric,  NULL::numeric, 'dias', 'SOLO_ALERTA'::accion_regla,    'Apto para uso normal.',                                                                                                       0, NULL::text),
  ('20000000-0000-0000-0000-000000000011'::uuid, 'AMARILLO','BETWEEN', 3::numeric,  5::numeric,    'dias', 'SOLO_ALERTA',    'Vence esta semana: priorízalo en el menú del día.',                                                                           1, 'REDISTRIBUCION_INTERNA'),
  ('20000000-0000-0000-0000-000000000011'::uuid, 'NARANJA', 'BETWEEN', 1::numeric,  2::numeric,    'dias', 'SOLO_ALERTA',    'Vence en 1-2 días: úsalo hoy o retíralo del servicio.',                                                                        2, 'REDISTRIBUCION_INTERNA'),
  ('20000000-0000-0000-0000-000000000011'::uuid, 'ROJO',    'LTE',     NULL::numeric, 0::numeric,  'dias', 'BLOQUEA_SALIDA', 'Vencido. Producto de alto riesgo: retirar del consumo y disponer de forma controlada. No apto para donación ni compostaje.',   3, 'DISPOSICION_CONTROLADA')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000011');

-- 1.2 Perecederos intermedios: VERDE >7 · AMARILLO 4-7 · NARANJA 1-3 · ROJO ≤0
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001',
        'VENCIMIENTO', 'CATEGORIA',
        (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'Perecederos intermedios'),
        'Vencimiento — perecederos intermedios', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_min, valor_max, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000012'::uuid, 'VERDE'::color_semaforo,   'GT',      7::numeric,  NULL::numeric, 'dias', 'SOLO_ALERTA'::accion_regla,    'Apto para uso normal.',                                                                          0, NULL::text),
  ('20000000-0000-0000-0000-000000000012'::uuid, 'AMARILLO','BETWEEN', 4::numeric,  7::numeric,    'dias', 'SOLO_ALERTA',    'Por vencer: priorizar su uso en los próximos días.',                                             1, 'REDISTRIBUCION_INTERNA'),
  ('20000000-0000-0000-0000-000000000012'::uuid, 'NARANJA', 'BETWEEN', 1::numeric,  3::numeric,    'dias', 'SOLO_ALERTA',    'Vence esta semana: si no se usará a tiempo, aparta para banco de alimentos antes de que venza.',  2, 'BANCO_ALIMENTOS'),
  ('20000000-0000-0000-0000-000000000012'::uuid, 'ROJO',    'LTE',     NULL::numeric, 0::numeric,  'dias', 'BLOQUEA_SALIDA', 'Vencido: retirar del consumo. Si es material vegetal sin contaminación aparente, derivar a compostaje.', 3, 'COMPOSTAJE')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000012');

-- 1.3 No perecederos: VERDE >30 · AMARILLO 8-30 · NARANJA 1-7 · ROJO ≤0
INSERT INTO reglas (id, tenant_id, tipo, ambito, ambito_id, nombre, creado_por)
VALUES ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001',
        'VENCIMIENTO', 'CATEGORIA',
        (SELECT id FROM categorias WHERE tenant_id = '10000000-0000-0000-0000-000000000001' AND nombre = 'No perecederos'),
        'Vencimiento — no perecederos', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regla_umbrales (regla_id, color, operador, valor_min, valor_max, unidad, accion, mensaje, orden, estrategia_circular)
SELECT * FROM (VALUES
  ('20000000-0000-0000-0000-000000000013'::uuid, 'VERDE'::color_semaforo,   'GT',      30::numeric, NULL::numeric, 'dias', 'SOLO_ALERTA'::accion_regla,    'Apto para uso normal.',                                              0, NULL::text),
  ('20000000-0000-0000-0000-000000000013'::uuid, 'AMARILLO','BETWEEN', 8::numeric,  30::numeric,   'dias', 'SOLO_ALERTA',    'Por vencer este mes: revisar rotación y ajustar compras.',           1, 'REDISTRIBUCION_INTERNA'),
  ('20000000-0000-0000-0000-000000000013'::uuid, 'NARANJA', 'BETWEEN', 1::numeric,  7::numeric,    'dias', 'SOLO_ALERTA',    'Vence esta semana y sigue apto: es el momento de donar, antes del vencimiento.', 2, 'DONACION'),
  ('20000000-0000-0000-0000-000000000013'::uuid, 'ROJO',    'LTE',     NULL::numeric, 0::numeric,  'dias', 'BLOQUEA_SALIDA', 'Vencido: bloquear y registrar disposición.',                         3, 'DISPOSICION_CONTROLADA')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM regla_umbrales WHERE regla_id = '20000000-0000-0000-0000-000000000013');
