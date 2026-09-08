-- ================================================================
-- 020 — Costo de referencia por producto → "valor en riesgo" del semáforo
-- ================================================================
-- Hoy no existe ningún costo/precio reutilizable por producto:
-- reception_items.precio_unitario (003) queda aislado a cada factura. Sin un
-- costo de referencia no hay forma de estimar cuánto dinero se pierde si un
-- lote amarillo/naranja se daña.
--
-- Se llena de dos formas (no excluyentes):
--   1. El admin lo edita a mano en Catálogo.
--   2. Se autocompleta solo con el último precio de una recepción confirmada
--      (trigger abajo) — sin trabajo extra una vez que reciben por factura.

ALTER TABLE products ADD COLUMN IF NOT EXISTS costo_unitario_referencia numeric(12,2);

-- ================================================================
-- Autocompletar costo_unitario_referencia al confirmar una recepción.
-- SECURITY DEFINER + search_path='' (convención del proyecto, ver 006/013):
-- quien confirma una recepción es normalmente el auditor, que NO tiene permiso
-- de UPDATE sobre products (policy "products_update" exige rol admin) — el
-- trigger corre con privilegios del dueño de la función, no del llamador.
-- ================================================================
CREATE OR REPLACE FUNCTION actualizar_costo_producto_desde_recepcion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado IN ('confirmada', 'con_pendientes')
     AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    UPDATE public.products p
    SET costo_unitario_referencia = ri.precio_unitario
    FROM public.reception_items ri
    WHERE ri.reception_id = NEW.id
      AND ri.producto_id = p.id
      AND ri.precio_unitario IS NOT NULL
      AND ri.precio_unitario > 0;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_actualizar_costo_producto ON receptions;
CREATE TRIGGER trg_actualizar_costo_producto
  AFTER UPDATE ON receptions
  FOR EACH ROW EXECUTE FUNCTION actualizar_costo_producto_desde_recepcion();
