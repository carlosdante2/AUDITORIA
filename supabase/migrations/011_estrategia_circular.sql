-- ================================================================
-- 011 — Economía circular / valorización en el umbral de la regla
-- ================================================================
-- Decisión 2026-08-12 (unificación del spec): la ruta de valorización
-- (banco de alimentos, donación, compostaje…) se modela como dato del
-- umbral, elegido por el admin. Los ODS se DERIVAN de la estrategia en
-- la UI (catálogo fijo), no se guardan por regla.
--
-- Cero cableado: si el umbral no trae estrategia, no hay ruta sugerida.

ALTER TABLE regla_umbrales
  ADD COLUMN IF NOT EXISTS estrategia_circular text;

-- Valores permitidos (nullable = sin ruta de valorización).
ALTER TABLE regla_umbrales
  DROP CONSTRAINT IF EXISTS regla_umbrales_estrategia_chk;
ALTER TABLE regla_umbrales
  ADD CONSTRAINT regla_umbrales_estrategia_chk CHECK (
    estrategia_circular IS NULL OR estrategia_circular IN (
      'REDISTRIBUCION_INTERNA',
      'BANCO_ALIMENTOS',
      'DONACION',
      'ALIMENTACION_ANIMAL',
      'COMPOSTAJE',
      'RECICLAJE_EMPAQUE',
      'DISPOSICION_CONTROLADA'
    )
  );
