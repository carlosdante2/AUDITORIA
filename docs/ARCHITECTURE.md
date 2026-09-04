# Arquitectura de Fresko

## Objetivo

Fresko es una plataforma de inventario y auditoría para operaciones de alimentos, con funcionamiento offline, sincronización, trazabilidad, control por roles e integración progresiva de IA.

## Arquitectura actual

- Next.js + React + TypeScript.
- Supabase Auth, PostgreSQL, Storage y RLS.
- IndexedDB mediante Dexie para operación offline.
- API Routes y Edge Functions.
- Integraciones de IA para voz, visión, embeddings y matching.

## Arquitectura objetivo

```text
Usuario / PWA
    |
    v
Frontend Next.js
    |
    +--> IndexedDB / Dexie
    |       |
    |       +--> colas offline
    |
    v
API / capa de aplicación
    |
    +--> autenticación
    +--> autorización
    +--> validaciones
    +--> reglas de negocio
    +--> trazabilidad
    |
    +--> Supabase
    |      +--> PostgreSQL
    |      +--> Storage
    |      +--> RLS
    |      +--> Edge Functions
    |
    +--> AI Gateway
           +--> voz
           +--> visión
           +--> embeddings
           +--> proveedor externo
           +--> futuro LLM local
```

## Principios

1. Offline first.
2. Seguridad por diseño.
3. Privacidad por diseño.
4. Aislamiento multi-tenant.
5. Configuración antes que hardcode.
6. IA asistida, no autoridad automática.
7. Trazabilidad de cambios críticos.
8. Escalabilidad basada en métricas.

## Modelo operativo objetivo

```text
Organización
  -> Sede
    -> Área / Sección
      -> Bodega
        -> Equipo
          -> Lote
            -> Producto
```

## Reglas de dependencia

- La UI no debe contener reglas críticas duplicadas.
- El frontend no debe ser la única barrera de autorización.
- Los secretos nunca deben exponerse al navegador.
- Las integraciones de IA deben desacoplarse mediante una capa/gateway.
- Las operaciones sensibles deben registrar evidencia suficiente para auditoría.
