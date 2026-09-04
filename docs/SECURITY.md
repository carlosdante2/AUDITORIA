# Seguridad

## Objetivo

Definir controles mínimos para proteger usuarios, datos, archivos, tenants y servicios externos.

## Controles prioritarios

- Autenticación obligatoria para operaciones privadas.
- Autorización por rol en servidor y base de datos.
- Aislamiento por `tenant_id`.
- RLS en todas las tablas multi-tenant.
- Secretos solo en servidor/Edge Functions.
- Validación de archivos: tipo, tamaño y ownership.
- Trazabilidad de cambios sensibles.
- Revisión de dependencias y cabeceras HTTP.
- No registrar datos sensibles innecesarios en logs.

## Roles

- `admin`: configuración y administración.
- `supervisor`: revisión y seguimiento.
- `auditor`: captura y operación de campo.

La interfaz puede ocultar acciones, pero la autorización real debe estar en backend/RLS.

## Git

- `master` no se usa para desarrollo directo.
- Cada integrante trabaja en una rama fija.
- Cambios hacia `master` por Pull Request.
- No usar `git push --force`.
- No subir `.env`, contraseñas, tokens ni claves privadas.

## Pendientes de auditoría

- Revisar permisos de update/insert de recepciones y elementos.
- Validar autorización en cada API.
- Revisar uso de `service_role`.
- Revisar protección de `master`.
- Revisar rate limiting.
- Revisar cabeceras de seguridad.
