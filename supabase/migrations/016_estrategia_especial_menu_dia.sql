-- ================================================================
-- 016 — Estrategia circular: agrega "Especial del menú del día"
-- ================================================================
-- Nueva ruta de valorización para productos que todavía están en buen
-- estado pero conviene usar pronto (típicamente umbral NARANJA): en vez
-- de esperar a que se acerquen más al vencimiento, se transforman en el
-- plato especial del día.

ALTER TABLE regla_umbrales DROP CONSTRAINT IF EXISTS regla_umbrales_estrategia_chk;
ALTER TABLE regla_umbrales
  ADD CONSTRAINT regla_umbrales_estrategia_chk CHECK (
    estrategia_circular IS NULL OR estrategia_circular IN (
      'REDISTRIBUCION_INTERNA',
      'BANCO_ALIMENTOS',
      'DONACION',
      'ALIMENTACION_ANIMAL',
      'COMPOSTAJE',
      'RECICLAJE_EMPAQUE',
      'DISPOSICION_CONTROLADA',
      'ESPECIAL_MENU_DIA'
    )
  );
