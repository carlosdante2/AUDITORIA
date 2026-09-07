-- ================================================================
-- 017 — Ubicar equipos en sede + sección real (no texto libre)
-- ================================================================
-- Hasta ahora `equipos.ubicacion` era texto libre, opcional y desconectado
-- de la jerarquía real de bodegas (sedes/secciones) que ya usan las sesiones
-- de auditoría. Resultado: el auditor no ve en qué bodega está cada nevera.
--
-- Se agregan sede_id/seccion_id (nullable — no rompe equipos existentes).
-- `ubicacion` se conserva como detalle libre opcional dentro de la sección
-- (ej. "rincón izquierdo", "junto a la puerta").

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS sede_id    uuid REFERENCES sedes(id);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS seccion_id uuid REFERENCES secciones(id);

CREATE INDEX IF NOT EXISTS equipos_sede_idx ON equipos (sede_id);
