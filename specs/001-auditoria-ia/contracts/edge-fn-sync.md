# Contract: Supabase Edge Function — sync

**Procesamiento de cola offline: conteos + fotos pendientes**

## Invocación

```
POST https://{project}.supabase.co/functions/v1/sync
Authorization: Bearer {supabase_access_token}
Content-Type: application/json
```

## Request Body

```json
{
  "counts": [
    {
      "local_id": "uuid",
      "session_id": "uuid",
      "producto_id": "uuid",
      "cantidad": 5.0,
      "unidad_medida": "kg",
      "fecha_vencimiento": "2026-08-10",
      "fecha_recepcion_o_compra": null,
      "estado_empaque": "intacto",
      "observacion_visual": "normal",
      "comentario": null,
      "lote_id": null,
      "codigo_lote": "L-2026-0812",
      "equipo_id": "uuid-o-null",
      "semaforo_color": "amarillo",
      "semaforo_razon": "Vence en 1 día",
      "semaforo_accion": "usar_primero_fifo",
      "semaforo_estrategia_circular": "priorizar_en_menu",
      "semaforo_ods": ["ODS-12"],
      "semaforo_metodo_calculo": "fecha_documentada",
      "dias_restantes": 1,
      "transcripcion_voz": "cinco kilogramos de carne lomo",
      "captura_metodo": "voz",
      "created_at": "2026-08-09T15:30:00Z"
    }
  ]
}
```

## Response 200

```json
{
  "processed": 3,
  "skipped": 1,
  "errors": []
}
```

`skipped`: conteos ya existentes (dedup por `local_id`).

## Response 207 (Multi-Status — algunos fallaron)

```json
{
  "processed": 2,
  "skipped": 0,
  "errors": [
    {
      "local_id": "uuid",
      "error": "PRODUCT_NOT_FOUND",
      "message": "El producto no existe en el catálogo del tenant"
    }
  ]
}
```

## SQL ejecutado internamente

```sql
INSERT INTO product_counts (local_id, session_id, tenant_id, ...)
VALUES ($1, $2, get_my_tenant_id(), ...)
ON CONFLICT (local_id) DO NOTHING;
```

## Notas de implementación

- Usa SERVICE_ROLE_KEY para bypass RLS en INSERT masivo
- Valida que `session_id` pertenece al tenant del JWT antes de insertar
- Procesa máximo 50 conteos por request
- Fotos se sincronizan por separado (upload directo a Supabase Storage desde cliente)
- **Requiere el header `Authorization: Bearer {access_token}` del usuario** —
  `verify_jwt = true` en `supabase/config.toml` lo exige a nivel de gateway antes
  de que el código de la función corra. El cliente (`lib/sync.ts`) obtiene el
  token vigente con `supabase.auth.getSession()` en cada intento de flush.
- Si `lote_id` no viene en el payload (captura hecha offline, donde `/api/lotes`
  nunca corrió), la función crea el lote aquí mismo con `codigo_lote`/`equipo_id`
  y lo enlaza. Ese lote queda **sin evaluar por el motor de reglas** (no está
  duplicado en Deno) hasta el próximo cron diario o lectura de temperatura de
  su equipo — mientras tanto se ve GRIS en Inventario.
- Antes de crear el lote, verifica por `local_id` si el conteo ya se sincronizó
  en un intento previo (reintento tras fallo de red del lado del cliente) para
  no crear un lote huérfano duplicado.
