# Offline y sincronización

## Objetivo

Permitir operación en campo con conectividad limitada sin perder trazabilidad.

## Datos locales actuales

- `products`
- `audioQueue`
- `photoQueue`
- `countQueue`
- `reglasCache`

## Flujo

```text
Captura local
  -> IndexedDB
  -> estado pending
  -> vuelve Internet
  -> autenticación
  -> sincronización
  -> validación servidor
  -> confirmación
  -> limpieza local
```

## Estados recomendados

- `pending`
- `syncing`
- `synced`
- `error`
- `conflict`

## Pendientes

- Revisar token de autorización en llamadas a Edge Functions.
- Mejorar reintentos.
- Añadir reintento manual.
- Evitar duplicados.
- Definir resolución de conflictos.
- Comprimir imágenes antes de guardarlas/subirlas.
- Mostrar al usuario si quedan datos sin sincronizar.
