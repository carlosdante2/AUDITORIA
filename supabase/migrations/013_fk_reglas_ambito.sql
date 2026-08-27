-- Migration 013 (idempotente): Integridad referencial de reglas.ambito_id
-- ================================================================
-- Problema: `reglas.ambito_id` (009, línea 82) es un uuid suelto SIN llave
-- foránea. Borrar una categoría con reglas asignadas la deja huérfana
-- (ambito_id apunta a una categoría inexistente) y la regla nunca vuelve a
-- aplicarse — `resolverReglaAplicable()` la busca por un id que ya no existe.
--
-- Por qué no una FK plana: `ambito_id` es POLIMÓRFICO —
--   ambito = 'CATEGORIA' -> categorias.id
--   ambito = 'PRODUCTO'  -> products.id
--   ambito = 'GLOBAL'    -> NULL
-- Una FK a `categorias` rompería todas las reglas de ámbito PRODUCTO. Se valida
-- con triggers, que sí respetan el polimorfismo.
--
-- SECURITY DEFINER + search_path='' (convención del proyecto, ver 006): las
-- validaciones comprueban existencia real, sin que RLS oculte filas.

-- ================================================================
-- 1) Neutralizar reglas huérfanas preexistentes ANTES de instalar el trigger.
--    No se borran: se desactivan (auditable). Idempotente: sin huérfanas → no-op.
--    Debe ir antes de crear el trigger de validación (si no, el propio UPDATE
--    dispararía la excepción sobre la fila huérfana que intenta neutralizar).
-- ================================================================
UPDATE reglas r
SET activa = false, vigente_hasta = COALESCE(r.vigente_hasta, now())
WHERE r.ambito = 'CATEGORIA' AND r.ambito_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM categorias c WHERE c.id = r.ambito_id);

UPDATE reglas r
SET activa = false, vigente_hasta = COALESCE(r.vigente_hasta, now())
WHERE r.ambito = 'PRODUCTO' AND r.ambito_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = r.ambito_id);

-- ================================================================
-- 2) Validar ambito_id al crear/actualizar una regla
-- ================================================================
CREATE OR REPLACE FUNCTION validar_ambito_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.ambito = 'CATEGORIA' THEN
    IF NEW.ambito_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.categorias WHERE id = NEW.ambito_id) THEN
      RAISE EXCEPTION 'Regla de ámbito CATEGORIA referencia una categoría inexistente (ambito_id=%)', NEW.ambito_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NEW.ambito = 'PRODUCTO' THEN
    IF NEW.ambito_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.ambito_id) THEN
      RAISE EXCEPTION 'Regla de ámbito PRODUCTO referencia un producto inexistente (ambito_id=%)', NEW.ambito_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_ambito_id ON reglas;
CREATE TRIGGER trg_validar_ambito_id
  BEFORE INSERT OR UPDATE ON reglas
  FOR EACH ROW EXECUTE FUNCTION validar_ambito_id();

-- ================================================================
-- 3) Impedir borrar una categoría con reglas activas (espejo en BD de la guarda
--    de cliente en CategoriasClient.tsx del()). Protege también contra borrados
--    por API/SQL directa que el cliente no puede interceptar.
-- ================================================================
CREATE OR REPLACE FUNCTION proteger_categoria_con_reglas()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reglas
    WHERE ambito = 'CATEGORIA' AND ambito_id = OLD.id
      AND vigente_hasta IS NULL AND activa
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar la categoría %: tiene reglas de semáforo activas. Reasígnalas o elimínalas primero.', OLD.id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_proteger_categoria_con_reglas ON categorias;
CREATE TRIGGER trg_proteger_categoria_con_reglas
  BEFORE DELETE ON categorias
  FOR EACH ROW EXECUTE FUNCTION proteger_categoria_con_reglas();
