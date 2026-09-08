-- ================================================================
-- 018 — Habilita Supabase Realtime sobre `alertas`
-- ================================================================
-- Necesario para avisar a supervisor/admin al instante cuando una lectura de
-- temperatura (u otra dimensión del semáforo) dispara una alerta, sin que
-- tengan que recargar la pantalla de Alertas. Ver lib/useAlertasRealtime.ts.
-- RLS sigue aplicando: cada sesión solo recibe eventos de su propio tenant
-- (misma política "alertas_select" de la migración 009).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'alertas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alertas;
  END IF;
END $$;
