-- Migration 014 (idempotente): re-enlazar subcategorías de perecibilidad
-- ================================================================
-- Las 3 subcategorías (Perecederos críticos/intermedios/No perecederos) quedaron
-- con parent_id = NULL por una corrida vieja del seed, anterior a que se agregara
-- el enlace de padre. El seed (013/…) no las corrige porque su
--   INSERT ... ON CONFLICT (tenant_id, nombre) DO NOTHING
-- respeta la fila existente sin tocar parent_id. Este UPDATE las cuelga de
-- "Alimentos y Bebidas" como define el diseño (Semaforo_actualizado.md §5.1).
-- Idempotente: el filtro `child.parent_id IS NULL` la vuelve no-op una vez aplicada.
-- Inocuo funcionalmente hoy (el padre no tiene reglas propias), pero deja el árbol
-- correcto para la UI y para futuras reglas comunes en el nivel 1.

UPDATE categorias child
SET parent_id = parent.id
FROM categorias parent
WHERE child.tenant_id = '10000000-0000-0000-0000-000000000001'
  AND parent.tenant_id = child.tenant_id
  AND parent.nombre = 'Alimentos y Bebidas'
  AND child.nombre IN ('Perecederos críticos', 'Perecederos intermedios', 'No perecederos')
  AND child.parent_id IS NULL;
