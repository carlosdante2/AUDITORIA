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
