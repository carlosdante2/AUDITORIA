# Implementation Plan: AuditorIA PWA

**Branch**: `001-auditoria-ia` | **Date**: 2026-08-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-auditoria-ia/spec.md`

## Summary

AuditorIA es una PWA multi-tenant de auditoría de inventario para hotelería
colombiana (sector A&B, normas INVIMA). Dos módulos: (1) auditoría de campo
con captura por voz vía Groq Whisper + semáforo sanitario determinista 100%
offline, y (2) recepción de mercadería por foto de factura con extracción
Groq Vision + matching semántico pgvector. Arquitectura offline-first con
Dexie.js (IndexedDB), cola de audio con flush por evento `online`, y
aislamiento multi-tenant completo por RLS en Supabase.

## Technical Context

**Language/Version**: TypeScript 5.x — Next.js 15 (App Router), Deno 2.x
(Supabase Edge Functions)

**Primary Dependencies**:
- `next` 15, `serwist` (PWA Service Worker para App Router)
- `tailwindcss` 3, `shadcn/ui` (componentes UI)
- `dexie` 4 (IndexedDB offline storage)
- `@supabase/supabase-js` 2 (cliente + auth)
- `groq-sdk` (Whisper STT + Vision)
- `openai` SDK (embeddings `text-embedding-3-small`)
- `vitest` (tests unitarios semáforo)

**Storage**:
- Supabase PostgreSQL + pgvector (remoto, multitenant con RLS)
- IndexedDB via Dexie.js (local offline: catálogo, cola audio, cola conteos, fotos)
- Supabase Storage privado (fotos evidencia + facturas, URLs firmadas 1h)

**Testing**:
- Vitest — unit tests de `lib/semaforo.ts` (sin red, sin DOM)
- Playwright — e2e offline flow (intercept network, verificar sync)

**Target Platform**: PWA instalable — Android 10+ Chrome, iOS 14+ Safari,
desktop Chrome/Edge para supervisores y admins

**Project Type**: PWA (Next.js App Router + Serwist Service Worker)

**Performance Goals**:
- Semáforo local: < 100ms por evaluación (SC-002)
- Captura voz → resultado total: < 15s online (SC-001)
- Dashboard sync: < 30s (SC-010)
- Service Worker precache: rutas de captura disponibles offline al 100%

**Constraints**:
- Offline-first NON-NEGOTIABLE (Principio IV de la Constitution)
- `tenant_id` en todo INSERT — validado por RLS + constraint NOT NULL
- `semaforo.ts` NUNCA hace llamadas de red — función pura TypeScript
- Fotos comprimidas a ≤ 2MB antes de guardar en IndexedDB
- `app_metadata` para rol y tenant_id — nunca `user_metadata`

**Scale/Scope**:
- ≤ 500 productos por tenant (cabe en IndexedDB + en memoria para similarity)
- ≤ 5 auditores concurrentes por tenant
- Multi-tenant: N hoteles en una instancia de Supabase

## Constitution Check

| Principio | Verificación | Estado |
|-----------|-------------|--------|
| I. Multi-tenant | `tenant_id` NOT NULL en 6 tablas; RLS en todas | ✅ PASS |
| II. RLS intocable | Migrations crean RLS desde día 0; ningún bypass en flujo normal | ✅ PASS |
| III. app_metadata | Auth schema usa `app_metadata` para rol y tenant; `profiles` solo display | ✅ PASS |
| IV. Offline-first | Semáforo puro TS, Dexie queue, flush por `online` + arranque | ✅ PASS |
| V. Seguridad alimentaria | `semaforo.ts` determinista; Claude haiku es post-hoc, nunca override | ✅ PASS |
| VI. Semáforo por sector | Tabla `sectors.semaforo_config` JSONB; parámetros por subtipo | ✅ PASS |
| VII. Sin aprobación | Tabla `pending_products`; productos_pendientes no van a `products` sin aprobación Admin/Supervisor | ✅ PASS |
| VIII. Un cambio a la vez | Proceso de entrega confirmado antes de continuar | ✅ PASS |
| IX. Simplicidad | Stack mínimo; cosine similarity manual (no WASM) para ≤500 items | ✅ PASS |

**Resultado**: Sin violaciones. Sin Complexity Tracking requerido.

## Project Structure

### Documentation (this feature)

```text
specs/001-auditoria-ia/
├── plan.md              ← Este archivo
├── research.md          ← Decisiones técnicas (10 secciones)
├── data-model.md        ← Esquema DB + IndexedDB + Storage
├── quickstart.md        ← 5 escenarios de validación
├── contracts/
│   ├── api-voz.md       ← POST /api/voz (Groq Whisper relay)
│   ├── api-vision.md    ← POST /api/vision (Groq Vision relay)
│   ├── api-match.md     ← POST /api/match (pgvector similarity)
│   ├── api-semaforo-ia.md ← POST /api/semaforo-ia (Claude haiku)
│   └── edge-fn-sync.md  ← supabase/functions/sync (cola offline)
├── checklists/
│   └── requirements.md
└── tasks.md             ← Generado por /speckit-tasks (próximo paso)
```

### Source Code (repository root)

```text
/                               ← Raíz del proyecto AuditorIA
├── app/                        ← Next.js App Router
│   ├── layout.tsx              ← Root layout + offline flush useEffect
│   ├── sw.ts                   ← Serwist Service Worker entry
│   ├── manifest.json           ← PWA manifest
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                  ← Rutas protegidas
│   │   ├── layout.tsx          ← Auth guard + tenant context
│   │   ├── captura/
│   │   │   ├── page.tsx        ← Auditor: captura de conteos (offline-first)
│   │   │   └── components/
│   │   │       ├── VoiceCapture.tsx
│   │   │       ├── SemaforoDisplay.tsx
│   │   │       └── CountForm.tsx
│   │   ├── sesiones/
│   │   │   ├── page.tsx        ← Lista de sesiones (auditor/supervisor)
│   │   │   └── [id]/page.tsx   ← Detalle de sesión + insights
│   │   ├── recepcion/
│   │   │   ├── page.tsx        ← Lista de recepciones
│   │   │   ├── nueva/page.tsx  ← Foto factura → extracción → confirmación
│   │   │   └── [id]/page.tsx   ← Detalle recepción
│   │   ├── dashboard/
│   │   │   └── page.tsx        ← Supervisor: KPIs semáforo + alertas
│   │   └── admin/
│   │       ├── catalogo/page.tsx      ← Admin: CRUD productos
│   │       ├── pendientes/page.tsx    ← Admin: aprobar/rechazar productos
│   │       └── importar/page.tsx      ← Admin: CSV/Excel upload
│   └── api/
│       ├── voz/route.ts         ← Groq Whisper relay
│       ├── vision/route.ts      ← Groq Vision relay
│       ├── match/route.ts       ← pgvector similarity
│       └── semaforo-ia/route.ts ← Claude haiku insights
│
├── lib/
│   ├── semaforo.ts             ← Lógica semáforo (función pura, 0 deps de red)
│   ├── db.ts                   ← Dexie schema y tablas IndexedDB
│   ├── sync.ts                 ← flushAudioQueue, flushCountQueue, flushPhotoQueue
│   ├── matching.ts             ← cosine similarity offline (client-side)
│   ├── supabase.ts             ← Cliente Supabase (browser)
│   ├── supabase-server.ts      ← Cliente Supabase (server, cookies)
│   └── queries.ts              ← Queries a Supabase (RLS-respetadas)
│
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── SemaforoChip.tsx        ← Badge verde/amarillo/rojo
│   ├── OfflineIndicator.tsx    ← Estado de conexión + cola pendiente
│   ├── AudioQueueStatus.tsx    ← Indicador de ítems en cola
│   └── PhotoCapture.tsx        ← Camera API + compresión canvas
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    ← tenants, sectors, profiles, products
│   │   ├── 002_audit_tables.sql      ← audit_sessions, product_counts
│   │   ├── 003_reception_tables.sql  ← receptions, reception_items
│   │   ├── 004_pending_products.sql  ← pending_products
│   │   ├── 005_rls_policies.sql      ← RLS en todas las tablas
│   │   └── 006_functions.sql         ← get_my_tenant_id, get_my_rol
│   ├── seed.sql                ← Datos de prueba (2 tenants, sector A&B)
│   └── functions/
│       ├── sync/index.ts       ← Cola offline → upsert con dedup
│       └── embeddings/index.ts ← Generación batch embeddings
│
├── lib/__tests__/
│   ├── semaforo.test.ts        ← Vitest unit tests (todos los casos SEMAFORO_v2)
│   └── matching.test.ts        ← Tests cosine similarity
│
├── next.config.ts              ← withSerwist wrapper
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

**Structure Decision**: Web application (frontend Next.js + backend Supabase).
No backend/ directory separado — los Route Handlers de Next.js actúan como
capa API. Las Supabase Edge Functions son la única lógica backend que requiere
SERVICE_ROLE_KEY. Estructura monorepo en `/` (un solo proyecto Next.js).
