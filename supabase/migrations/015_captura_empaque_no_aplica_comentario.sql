-- ================================================================
-- 015 — Captura: "No aplica" en empaque + comentario libre del auditor
-- ================================================================
-- Contexto: frutas y verduras a granel (papa, tomate, cebolla en canasta)
-- no tienen empaque que evaluar. El hallazgo real de esos productos queda
-- descrito por observacion_visual; estado_empaque solo debe indicar que
-- esa dimensión no aplica al producto, sin participar en la cuarentena.

-- 1. Estado del empaque: agrega 'no_aplica'.
--    mapCuarentena (CountForm.tsx) solo dispara NO_CONFORME/EN_EVALUACION
--    cuando empaque es 'roto_abierto_fuga' o 'dano_leve' — 'no_aplica' cae
--    en el mismo caso neutral que 'intacto' y el color queda a cargo de
--    observacion_visual.
ALTER TABLE product_counts DROP CONSTRAINT IF EXISTS product_counts_estado_empaque_check;
ALTER TABLE product_counts
  ADD CONSTRAINT product_counts_estado_empaque_check
  CHECK (estado_empaque IN ('intacto', 'dano_leve', 'roto_abierto_fuga', 'no_aplica'));

-- 2. Comentario libre opcional del auditor al registrar el conteo.
ALTER TABLE product_counts
  ADD COLUMN IF NOT EXISTS comentario text;
