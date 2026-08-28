# Data Model: Fresko

**Feature**: 001-auditoria-ia
**Date**: 2026-08-09
**Source**: spec.md + research.md

---

## Entidades y Esquema

### `tenants`
Representa un cliente (hotel, cadena hotelera).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | ID del tenant |
| `nombre` | text | NOT NULL | Nombre comercial |
| `sector_id` | uuid | FK → sectors.id, NOT NULL | Sector operativo |
| `plan` | text | NOT NULL, DEFAULT 'free' | Plan de suscripción |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Fecha de alta |

**RLS**: Solo Service Role puede leer/escribir.

---

### `sectors`
Sectores de industria con configuración de semáforo.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | ID del sector |
| `nombre` | text | NOT NULL, UNIQUE | e.g., "alimentos_bebidas" |
| `semaforo_config` | jsonb | NOT NULL | Parámetros de clasificación (días alertas por subtipo) |
| `prompt_ia` | text | NOT NULL | Prompt base para Claude haiku (insights) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |

**Dato inicial**: sector "alimentos_bebidas" (INVIMA Colombia).

**semaforo_config structure**:
```json
{
  "subtipos": {
    "carne_res": { "vid_estimada_dias": 3, "alerta_amarilla_dias": 1 },
    "lacteo": { "vid_estimada_dias": 7, "alerta_amarilla_dias": 2 },
    "frutas_verduras": { "vid_estimada_dias": 5, "alerta_amarilla_dias": 2 },
    "enlatado": { "vid_estimada_dias": null, "alerta_amarilla_dias": 30 },
    "granos_secos": { "vid_estimada_dias": null, "alerta_amarilla_dias": 60 }
  }
}
```

---

### `profiles`
Extiende auth.users de Supabase con datos de perfil.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, FK → auth.users.id | ID usuario (igual al auth) |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | Tenant al que pertenece |
| `nombre` | text | NOT NULL | Nombre para mostrar |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |

**Nota**: `rol` y `tenant_id` viven en `auth.users.app_metadata` (modificable solo con SERVICE_ROLE_KEY). `profiles` solo guarda datos de display.

**RLS**: Usuario puede leer su propio perfil; admin puede leer todos del mismo tenant.

---

### `products`
Catálogo de productos aprobados por tenant.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | ID del producto |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | Tenant dueño |
| `nombre` | text | NOT NULL | Nombre normalizado |
| `unidad_medida` | text | NOT NULL | e.g., "kg", "litros", "unidades" |
| `subtipo` | text | NOT NULL | Clave en semaforo_config |
| `requiere_fecha_vencimiento` | boolean | NOT NULL, DEFAULT true | Según norma INVIMA |
| `embedding` | vector(1536) | NULL | OpenAI text-embedding-3-small |
| `estado` | text | NOT NULL, DEFAULT 'activo' | 'activo' \| 'inactivo' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | - |

**Uniqueness**: UNIQUE(tenant_id, nombre, unidad_medida).

**Indexes**:
- `products_embedding_idx` USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
- `products_tenant_idx` ON (tenant_id, estado)

**RLS**: Auditor/Supervisor/Admin del mismo tenant pueden leer; Admin puede INSERT/UPDATE.

---

### `pending_products` (productos_pendientes)
Productos detectados pero no aprobados — de facturas o propuesta manual del auditor.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | - |
| `nombre_sugerido` | text | NOT NULL | Como vino en factura o propuesto por auditor |
| `unidad_sugerida` | text | NOT NULL | - |
| `subtipo_sugerido` | text | NULL | Puede ser null si no se pudo inferir |
| `origen` | text | NOT NULL | 'factura' \| 'manual' |
| `recepcion_item_id` | uuid | FK → reception_items.id, NULL | Presente si viene de factura |
| `match_candidates` | jsonb | NULL | Top-3 candidatos del catálogo con scores |
| `aprobado_por` | uuid | FK → profiles.id, NULL | NULL = pendiente |
| `producto_aprobado_id` | uuid | FK → products.id, NULL | Enlace post-aprobación |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |

**State transitions**:
```
PENDIENTE → (Admin/Supervisor revisa) → APROBADO (crea product) | RECHAZADO
```

**RLS**: Auditor puede INSERT; Supervisor/Admin pueden UPDATE (aprobar/rechazar).

---

### `audit_sessions`
Sesión de auditoría de inventario por bodega.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | - |
| `bodega` | text | NOT NULL | e.g., "Bodega Principal", "Bar Piso 3" |
| `estado` | text | NOT NULL, DEFAULT 'abierta' | 'abierta' \| 'cerrada' |
| `supervisor_id` | uuid | FK → profiles.id, NULL | Asignado al cerrar |
| `insights_ia` | text | NULL | Resumen ejecutivo de Claude haiku |
| `opened_at` | timestamptz | NOT NULL, DEFAULT now() | - |
| `closed_at` | timestamptz | NULL | Se llena al cerrar |

**RLS**: Auditor puede INSERT y ver sus propias sesiones; Supervisor/Admin ven todas del tenant.

---

### `product_counts`
Conteos individuales de productos durante una sesión de auditoría.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | DB PK |
| `local_id` | uuid | NOT NULL, UNIQUE | UUID generado en cliente — clave de dedup |
| `session_id` | uuid | FK → audit_sessions.id, NOT NULL | - |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | Desnormalizado para RLS simple |
| `producto_id` | uuid | FK → products.id, NOT NULL | - |
| `cantidad` | numeric(10,3) | NOT NULL, CHECK (cantidad >= 0) | - |
| `unidad_medida` | text | NOT NULL | Copiado del producto al momento del conteo |
| `fecha_vencimiento` | date | NULL | Null si no aplica según norma |
| `fecha_recepcion_o_compra` | date | NULL | Para estimar vida útil sin fecha vencimiento |
| `estado_empaque` | text | NOT NULL | 'intacto' \| 'dano_leve' \| 'roto_abierto_fuga' |
| `observacion_visual` | text | NOT NULL | 'normal' \| 'dudoso' \| 'no_conforme' |
| `foto_evidencia_url` | text | NULL | URL firmada de Supabase Storage |
| `semaforo_color` | text | NOT NULL | 'verde' \| 'amarillo' \| 'rojo' |
| `semaforo_razon` | text | NOT NULL | Explicación max 150 chars |
| `semaforo_accion` | text | NOT NULL | Acción en snake_case |
| `semaforo_estrategia_circular` | text | NULL | Estrategia de economía circular |
| `semaforo_ods` | text[] | NOT NULL, DEFAULT '{}' | ODS relacionados |
| `semaforo_metodo_calculo` | text | NOT NULL | 'fecha_documentada' \| 'estimado_por_recepcion' \| 'no_aplica' |
| `dias_restantes` | integer | NULL | Calculado localmente por semáforo |
| `transcripcion_voz` | text | NULL | Texto de Whisper si se capturó por voz |
| `captura_metodo` | text | NOT NULL, DEFAULT 'manual' | 'voz' \| 'manual' |
| `sincronizado` | boolean | NOT NULL, DEFAULT false | false = pendiente en cola offline |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |

**Key constraint**: UNIQUE(local_id) — permite ON CONFLICT DO NOTHING para dedup.

**RLS**: Auditor puede INSERT; Supervisor/Admin pueden leer y UPDATE (cerrar sesión).

---

### `receptions` (recepciones)
Proceso de recepción de mercadería con foto de factura.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | - |
| `auditor_id` | uuid | FK → profiles.id, NOT NULL | Quien recibe |
| `proveedor` | text | NULL | Nombre del proveedor si se detecta en factura |
| `foto_factura_url` | text | NULL | URL firmada bucket invoice-photos |
| `estado` | text | NOT NULL, DEFAULT 'borrador' | 'borrador' \| 'confirmada' \| 'con_pendientes' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |
| `confirmed_at` | timestamptz | NULL | - |

---

### `reception_items`
Líneas individuales de una recepción (un producto por línea).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - |
| `reception_id` | uuid | FK → receptions.id, NOT NULL | - |
| `tenant_id` | uuid | FK → tenants.id, NOT NULL | Desnormalizado para RLS |
| `producto_id` | uuid | FK → products.id, NULL | NULL si no encontrado en catálogo |
| `descripcion_extraida` | text | NOT NULL | Texto raw de la factura (Groq Vision) |
| `cantidad` | numeric(10,3) | NULL | Puede ser null si no está claro en factura |
| `precio_unitario` | numeric(12,2) | NULL | Si aparece en factura |
| `match_score` | numeric(4,3) | NULL | Score coseno del match (0–1) |
| `estado` | text | NOT NULL, DEFAULT 'confirmado' | 'confirmado' \| 'corregido' \| 'pendiente_aprobacion' |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | - |

---

## Funciones SQL Auxiliares

### `get_my_tenant_id() RETURNS uuid`
```sql
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;
```

### `get_my_rol() RETURNS text`
```sql
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$;
```

---

## Diagrama de Relaciones (texto)

```
tenants ──< profiles
tenants ──< products
tenants ──< audit_sessions ──< product_counts >── products
tenants ──< receptions ──< reception_items >── products (nullable)
tenants ──< pending_products >── reception_items (nullable)
pending_products >── products (post-aprobación)
sectors ──< tenants
```

---

## Almacenamiento Offline (Dexie.js IndexedDB)

### Tabla `products` (cache local)
```typescript
{
  id: string;
  nombre: string;
  unidad_medida: string;
  subtipo: string;
  requiere_fecha_vencimiento: boolean;
  embedding: number[];   // Float32Array serializado
  updated_at: string;    // Para invalidación de cache
}
```

### Tabla `audio_queue`
```typescript
{
  id: string;            // local_id del conteo
  blob: Blob;
  mimeType: string;
  recordedAt: number;    // timestamp
  sessionId: string;
  productHint?: string;
}
```

### Tabla `photo_queue`
```typescript
{
  id: string;            // local_id del conteo o reception_id
  blob: Blob;
  tipo: 'evidencia' | 'factura';
  localCountId?: string;
  receptionId?: string;
}
```

### Tabla `count_queue` (conteos pendientes de sync)
```typescript
{
  local_id: string;
  session_id: string;
  data: ProductCountPayload;  // todos los campos de product_counts
  status: 'pending' | 'syncing' | 'error';
  attempts: number;
  last_error?: string;
}
```

---

## Supabase Storage Buckets

| Bucket | Acceso | Path Pattern |
|--------|--------|-------------|
| `evidence-photos` | Privado | `{tenant_id}/{session_id}/{local_id}.jpg` |
| `invoice-photos` | Privado | `{tenant_id}/{reception_id}/factura.jpg` |

URLs generadas con `createSignedUrl()` — expiración 1 hora para viewing, 5 minutos para upload.
