-- ================================================================
-- 019 — Enlaza cada conteo de auditoría con su lote de inventario
-- ================================================================
-- `product_counts` (bitácora de auditoría, inmutable) y `lotes` (estado vivo
-- del inventario, se re-evalúa solo con el tiempo/temperatura) son tablas
-- separadas a propósito — fusionarlas rompería una de las dos propiedades.
-- Pero hoy están completamente desconectadas: no hay forma de ir del conteo
-- que hizo un auditor al lote real que generó. Se agrega el enlace (1:1, cada
-- conteo crea su propio lote — /api/lotes siempre inserta, nunca actualiza).

ALTER TABLE product_counts ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes(id);
CREATE INDEX IF NOT EXISTS product_counts_lote_idx ON product_counts (lote_id);
