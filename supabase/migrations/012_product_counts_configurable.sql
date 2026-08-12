-- ================================================================
-- 012 — product_counts al modelo del motor configurable
-- ================================================================
-- La captura ahora colorea con el motor de reglas (5 colores, sin
-- umbrales cableados). El registro del conteo deja de depender del
-- semáforo viejo (3 colores + metodo_calculo).

-- 1. Semáforo de 3 → 5 colores (minúsculas en persistencia).
ALTER TABLE product_counts DROP CONSTRAINT IF EXISTS product_counts_semaforo_color_check;
ALTER TABLE product_counts
  ADD CONSTRAINT product_counts_semaforo_color_check
  CHECK (semaforo_color IN ('verde', 'amarillo', 'naranja', 'rojo', 'gris'));

-- 2. Razón / acción dejan de ser obligatorias (pueden venir vacías).
ALTER TABLE product_counts ALTER COLUMN semaforo_razon  DROP NOT NULL;
ALTER TABLE product_counts ALTER COLUMN semaforo_accion DROP NOT NULL;
ALTER TABLE product_counts ALTER COLUMN semaforo_razon  SET DEFAULT '';
ALTER TABLE product_counts ALTER COLUMN semaforo_accion SET DEFAULT '';

-- 3. metodo_calculo es legado del motor viejo: opcional, sin CHECK.
ALTER TABLE product_counts DROP CONSTRAINT IF EXISTS product_counts_semaforo_metodo_calculo_check;
ALTER TABLE product_counts ALTER COLUMN semaforo_metodo_calculo DROP NOT NULL;

-- 4. Nuevos campos del resultado configurable (bloqueos + detalle por dimensión).
ALTER TABLE product_counts
  ADD COLUMN IF NOT EXISTS semaforo_bloqueo_salida  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS semaforo_bloqueo_ingreso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS semaforo_detalle         jsonb   NOT NULL DEFAULT '[]'::jsonb;
