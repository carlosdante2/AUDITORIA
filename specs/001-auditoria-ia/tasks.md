# Tasks: AuditorIA â€” PWA de AuditorÃ­a de Inventario

**Input**: Design documents from `/specs/001-auditoria-ia/`

**Prerequisites**: plan.md âœ… spec.md âœ… research.md âœ… data-model.md âœ… contracts/ âœ… quickstart.md âœ…

**Tests**: Incluidos solo para `lib/semaforo.ts` â€” funciÃ³n pura y crÃ­tica segÃºn la Constitution (Principio V). Resto de tests son opcionales y no se incluyen aquÃ­.

**Organization**: Tareas agrupadas por User Story para implementaciÃ³n y validaciÃ³n independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: A quÃ© user story pertenece (US1â€“US6)
- Rutas absolutas al repo raÃ­z `C:\Users\User-pc\Desktop\PROYECTOS\AUDITORIA\`

---

## Phase 1: Setup (Infraestructura inicial)

**Purpose**: InicializaciÃ³n del proyecto Next.js 15 PWA con todas las dependencias del plan.

- [x] T001 Initialize Next.js 15 TypeScript project with all dependencies from plan.md (next, serwist, tailwindcss, shadcn/ui, dexie, @supabase/supabase-js, groq-sdk, openai, vitest) â†’ package.json, tsconfig.json
- [x] T002 [P] Configure TailwindCSS 3 + shadcn/ui (init components) â†’ tailwind.config.ts, components/ui/
- [x] T003 [P] Configure Serwist PWA (Service Worker App Router mode, precache captura route) â†’ app/sw.ts, app/manifest.json, next.config.ts
- [x] T004 [P] Initialize Supabase CLI project config (reference AuditorIA project, storage buckets evidence-photos + invoice-photos privados) â†’ supabase/config.toml, .env.local.example
- [x] T005 [P] Configure Vitest for pure TypeScript unit tests (no DOM, no network) â†’ vitest.config.ts

**Checkpoint**: `npm run dev` sin errores + Service Worker registrado en DevTools

---

## Phase 2: Foundational (Prerrequisitos bloqueantes)

**Purpose**: Esquema DB completo + autenticaciÃ³n + offline base. NADA de user story puede empezar hasta completar esta fase.

**âš ï¸ CRÃTICO**: NingÃºn trabajo de User Story puede comenzar hasta que esta fase estÃ© completa.

- [x] T006 Create migration 001 â€” tenants, sectors (semaforo_config JSONB), profiles, products (pgvector extension + ivfflat index, UNIQUE tenant_id+nombre+unidad_medida) â†’ supabase/migrations/001_initial_schema.sql
- [x] T007 [P] Create migration 002 â€” audit_sessions, product_counts (local_id UUID UNIQUE, todos los campos del semÃ¡foro desnormalizados, ON CONFLICT DO NOTHING) â†’ supabase/migrations/002_audit_tables.sql
- [x] T008 [P] Create migration 003 â€” receptions, reception_items (match_score, estado pendiente_aprobacion) â†’ supabase/migrations/003_reception_tables.sql
- [x] T009 [P] Create migration 004 â€” pending_products (match_candidates JSONB, estados pendiente/aprobado/rechazado) â†’ supabase/migrations/004_pending_products.sql
- [x] T010 Create migration 005 â€” RLS policies en las 7 tablas usando get_my_tenant_id() (DEPENDE de T006â€“T009) â†’ supabase/migrations/005_rls_policies.sql
- [x] T011 Create migration 006 â€” get_my_tenant_id() y get_my_rol() SECURITY DEFINER (DEPENDE de T010) â†’ supabase/migrations/006_functions.sql
- [x] T012 Create seed SQL â€” 2 tenants de prueba, sector alimentos_bebidas con semaforo_config completo, 10 productos de muestra con embeddings null â†’ supabase/seed.sql
- [x] T013 [P] Implement Supabase browser client + server client (cookie-based para App Router) â†’ lib/supabase.ts, lib/supabase-server.ts
- [x] T014 [P] Implement Dexie 4 schema offline (tables: products, audio_queue, photo_queue, count_queue con types TypeScript) â†’ lib/db.ts
- [x] T015 [P] Implement 4 Next.js Route Handlers relay (stubs con auth check): vozâ†’Groq Whisper, visionâ†’Groq Vision, matchâ†’pgvector, semaforo-iaâ†’Claude haiku â†’ app/api/voz/route.ts, app/api/vision/route.ts, app/api/match/route.ts, app/api/semaforo-ia/route.ts
- [x] T016 Implement root layout con flush useEffect (window.addEventListener('online') + flushAll en mount) â†’ app/layout.tsx
- [x] T017 Implement auth login page + app layout con guard (redirige a /login si no autenticado, extrae tenant_id y rol de app_metadata) â†’ app/(auth)/login/page.tsx, app/(app)/layout.tsx
- [x] T018 [P] Implement OfflineIndicator component (badge online/offline + total items en cola) â†’ components/OfflineIndicator.tsx

**Checkpoint**: `supabase db push` OK + login funcional + DevTools muestra RLS activo en Network tab

---

## Phase 3: User Story 2 â€” SemÃ¡foro sanitario offline (Priority: P1) ðŸŽ¯ Base

**Goal**: `lib/semaforo.ts` como funciÃ³n pura determinista que clasifica cualquier producto en < 100ms sin conexiÃ³n. Base obligatoria para US1.

**Independent Test**: Correr `npm run test:semaforo` â€” todos los casos de `SEMAFORO_v2_accion_ODS.md` pasan. Dado producto con fecha ayer â†’ rojo en < 1ms. Sin red requerida.

### Tests para US2 (crÃ­ticos por Principio V de la Constitution)

> **Estos tests DEBEN fallar antes de implementar T019**

- [x] T019 [P] [US2] Create Vitest tests for semaforo.ts covering all cases from SEMAFORO_v2_accion_ODS.md: vencidoâ†’rojo, vence hoyâ†’rojo, empaque rotoâ†’rojo, carne 1 dÃ­aâ†’amarillo, enlatadoâ†’verde, fruta sin fechaâ†’estimado, observaciÃ³n no conformeâ†’rojo â†’ lib/__tests__/semaforo.test.ts

### ImplementaciÃ³n US2

- [x] T020 [US2] Implement lib/semaforo.ts â€” pure TypeScript function, zero network calls, full decision tree from SEMAFORO_v2_accion_ODS.md (subtipo classification, dÃ­as_restantes calc, empaque priority, circular economy strategies, ODS array) â€” make T019 tests pass â†’ lib/semaforo.ts
- [x] T021 [P] [US2] Implement SemaforoChip component (badge color + razÃ³n + acciÃ³n + estrategia_circular + ODS chips) â†’ components/SemaforoChip.tsx
- [x] T022 [P] [US2] Implement lib/sync.ts (stubs: flushAudioQueue, flushCountQueue, flushPhotoQueue â€” each reads Dexie queue, calls API, removes on success, sets status=error on failure) â†’ lib/sync.ts

**Checkpoint**: `npm run test:semaforo` â€” todos los tests pasan. SemaforoChip renderiza los 3 colores en Storybook/dev manual.

---

## Phase 4: User Story 1 â€” Captura de inventario por voz offline (Priority: P1) ðŸŽ¯ MVP

**Goal**: Auditor completa revisiÃ³n completa de bodega sin internet. Voz â†’ semÃ¡foro â†’ confirmar â†’ IndexedDB. Sync automÃ¡tico al recuperar red.

**Independent Test**: DevTools â†’ Offline â†’ abrir sesiÃ³n â†’ decir producto â†’ ver semÃ¡foro â†’ confirmar â†’ reconectar â†’ verificar sync en Supabase. Cero errores de red en el flujo principal.

- [x] T023 [P] [US1] Implement offline cosine similarity matching (load products from Dexie, compute dot product for all 500 items, return top-3 by score, threshold 0.70) â†’ lib/matching.ts
- [x] T024 [P] [US1] Implement AudioQueueStatus component (shows count of pending audio items, icon states: recording/queued/processing/done/error) â†’ components/AudioQueueStatus.tsx
- [x] T025 [US1] Implement VoiceCapture component (MediaRecorder hold-to-record, preserve mimeType, save blob+mimeType to audio_queue Dexie, show "grabado â€” pendiente" state â€” NEVER show success until Groq processes) â†’ app/(app)/captura/components/VoiceCapture.tsx
- [x] T026 [US1] Implement CountForm component (product search via matching.ts offline, quantity input, fecha_vencimiento, estado_empaque selector, observacion_visual selector â€” runs semaforo.ts on every change) â†’ app/(app)/captura/components/CountForm.tsx
- [x] T027 [P] [US1] Implement SemaforoDisplay component (full semaphore result inline in capture flow: color, razon, accion, estrategia_circular, ODS, dias_restantes) â†’ app/(app)/captura/components/SemaforoDisplay.tsx
- [x] T028 [US1] Implement captura main page (session management: open/list sessions, route to CountForm, show OfflineIndicator + AudioQueueStatus at top) â†’ app/(app)/captura/page.tsx
- [x] T029 [P] [US1] Implement sesiones list page (auditor view: own sessions, status badge, count per color) â†’ app/(app)/sesiones/page.tsx
- [x] T030 [US1] Implement session detail page (list all product_counts for session, semaforo per item, transcripcion_voz display) â†’ app/(app)/sesiones/[id]/page.tsx
- [x] T031 [US1] Implement Supabase Edge Function sync (POST batch counts with ON CONFLICT (local_id) DO NOTHING, validate session belongs to tenant, return processed/skipped/errors) â†’ supabase/functions/sync/index.ts

**Checkpoint**: Escenario 1 y 2 de quickstart.md pasan. Cola de audio funciona offline (Escenario 2). Dedup verificado.

---

## Phase 5: User Story 3 â€” Dashboard supervisor (Priority: P2)

**Goal**: Supervisor ve estado en tiempo real: alertas crÃ­ticas, sesiones activas, progreso de auditorÃ­a y puede cerrar sesiones.

**Independent Test**: Supervisor abre dashboard â†’ ve conteos en rojo de los Ãºltimos 10 min â†’ hace clic â†’ ve detalle + foto. Todo en < 1 minuto desde que auditor sincronizÃ³.

- [x] T032 [P] [US3] Implement lib/queries.ts (getActiveSessions, getSessionCounts, getAlertSummary por color, getPendingProducts â€” all scoped to tenant via RLS) â†’ lib/queries.ts
- [x] T033 [US3] Implement dashboard page supervisor (KPI cards: total verde/amarillo/rojo, lista alertas crÃ­ticas recientes, acceso rÃ¡pido a sesiones activas) â†’ app/(app)/dashboard/page.tsx
- [x] T034 [US3] Extend session detail page con supervisor view (ver todos los conteos incluyendo duplicados marcados, botÃ³n "cerrar sesiÃ³n", link a fotos de evidencia) â†’ app/(app)/sesiones/[id]/page.tsx
- [x] T035 [P] [US3] Implement pending products panel in dashboard (lista pending_products con match_candidates scores, botones aprobar/rechazar para supervisor) â†’ app/(app)/dashboard/page.tsx (pending section)
- [x] T036 [US3] Wire Claude haiku insights on session close (call /api/semaforo-ia with counts summary, store result in audit_sessions.insights_ia, display in session detail) â†’ app/(app)/sesiones/[id]/page.tsx, app/api/semaforo-ia/route.ts

**Checkpoint**: Escenario de dashboard del quickstart.md â€” supervisor identifica rojos en < 1 minuto. Closing de sesiÃ³n genera insights (si hay red) o muestra "insights no disponibles offline" (sin red).

---

## Phase 6: User Story 4 â€” RecepciÃ³n de mercaderÃ­a por factura (Priority: P2)

**Goal**: Auditor fotografÃ­a factura â†’ extracciÃ³n automÃ¡tica â†’ matching catÃ¡logo â†’ confirm/correct â†’ productos nuevos quedan pendientes de aprobaciÃ³n.

**Independent Test**: Foto de `tests/fixtures/factura-test.jpg` â†’ â‰¥ 8/10 items detectados â†’ al menos 1 pendiente_aprobacion creado si factura tiene producto nuevo. Flujo completo < 3 minutos.

- [x] T037 [P] [US4] Implement PhotoCapture component (camera API / file input, canvas compression to â‰¤2MB at quality 0.7, preview) â†’ components/PhotoCapture.tsx
- [x] T038 [US4] Implement nueva recepciÃ³n page â€” step 1: capture photo, upload to invoice-photos bucket, call /api/vision, show loading state â†’ app/(app)/recepcion/nueva/page.tsx
- [x] T039 [US4] Implement reception review step â€” item cards: descripcion_extraida + matched product + score + cantidad + confirm/correct buttons (step 2 of nueva recepciÃ³n) â†’ app/(app)/recepcion/nueva/page.tsx (review state)
- [x] T040 [US4] Implement /api/match route (generate embedding for query via OpenAI, pgvector cosine search scoped to tenant, return top-3 with scores, below_threshold flag) â†’ app/api/match/route.ts
- [x] T041 [US4] Implement pending product creation flow (items with score < 0.75 â†’ INSERT pending_products with match_candidates JSONB, origin='factura') â†’ app/(app)/recepcion/nueva/page.tsx (confirm step)
- [x] T042 [P] [US4] Implement recepciones list page (auditor: ver sus recepciones, estado, proveedor, fecha) â†’ app/(app)/recepcion/page.tsx
- [x] T043 [US4] Implement reception detail page (items lista + foto factura con signed URL + estado de cada Ã­tem) â†’ app/(app)/recepcion/[id]/page.tsx
- [x] T044 [US4] Implement Supabase Edge Function embeddings (generate OpenAI embedding for product name, UPDATE products SET embedding, batch mode for CSV import up to 500) â†’ supabase/functions/embeddings/index.ts

**Checkpoint**: Escenario 3 de quickstart.md pasa. Producto no encontrado aparece en panel de pendientes.

---

## Phase 7: User Story 5 â€” Evidencia fotogrÃ¡fica offline (Priority: P2)

**Goal**: Auditor adjunta foto a cualquier Ã­tem, offline. Foto sincroniza al recuperar red. Supervisor la ve en el dashboard.

**Independent Test**: DevTools â†’ Offline â†’ tomar foto de empaque roto â†’ confirmar Ã­tem â†’ reconectar â†’ foto aparece en sesiÃ³n del supervisor con URL firmada vÃ¡lida.

- [x] T045 [US5] Extend CountForm with photo evidence section (PhotoCapture inline, save blob to photo_queue Dexie with tipo='evidencia', show "foto pendiente" badge) â†’ app/(app)/captura/components/CountForm.tsx
- [x] T046 [US5] Implement photo sync in lib/sync.ts (flushPhotoQueue: upload blob to evidence-photos/{tenant_id}/{session_id}/{local_id}.jpg, UPDATE product_counts SET foto_evidencia_url via signed URL) â†’ lib/sync.ts
- [x] T047 [P] [US5] Implement evidence photo viewer in session detail (signed URL fetch via createSignedUrl 1h expiry, lightbox on click) â†’ app/(app)/sesiones/[id]/page.tsx
- [x] T048 [P] [US5] Add getSignedUrl helper for evidence-photos and invoice-photos buckets â†’ lib/queries.ts

**Checkpoint**: Escenario 5 de quickstart.md pasa. Foto tomada offline aparece en supervisor tras reconexiÃ³n sin pÃ©rdida.

---

## Phase 8: User Story 6 â€” Admin gestiona catÃ¡logo y usuarios (Priority: P3)

**Goal**: Admin puede cargar catÃ¡logo CSV/Excel, aprobar productos pendientes con generaciÃ³n de embeddings automÃ¡tica, e invitar usuarios con roles.

**Independent Test**: Admin carga CSV con 50 productos vÃ¡lidos + 2 con errores â†’ 50 importados + reporte de 2 errores + embeddings generados < 5 minutos â†’ auditor puede buscar "leche" offline y encontrar "Leche Entera 1L".

- [x] T049 [P] [US6] Implement admin catalog page (CRUD: list active products, edit nombre/unidad/subtipo, deactivate) â†’ app/(app)/admin/catalogo/page.tsx
- [x] T050 [US6] Implement CSV/Excel import page (file upload, parse con validaciÃ³n por fila: columnas requeridas + subtipo vÃ¡lido, report errores sin detener importaciÃ³n, trigger Edge Function embeddings en batch) â†’ app/(app)/admin/importar/page.tsx
- [x] T051 [US6] Implement pending products approval page admin (list pending_products, show match_candidates scores, form to set nombre/unidad/subtipo on approve, INSERT into products â†’ trigger embeddings) â†’ app/(app)/admin/pendientes/page.tsx
- [x] T052 [US6] Wire embedding generation on product approval (on approve â†’ call Edge Function embeddings for new product_id, update Supabase â†’ clients sync on next login) â†’ app/(app)/admin/pendientes/page.tsx, supabase/functions/embeddings/index.ts
- [x] T053 [P] [US6] Implement user management page (invite by email, assign rol + tenant_id to app_metadata via SERVICE_ROLE_KEY Edge Function) â†’ app/(app)/admin/usuarios/page.tsx
- [x] T054 [US6] Implement catalog sync on login (fetch all active products with embeddings for tenant â†’ store in Dexie products table, measure sync time â‰¤ 60s for 500 products) â†’ lib/sync.ts (syncCatalog function), app/(app)/layout.tsx

**Checkpoint**: Escenario 6 del quickstart.md pasa. Escenario 4 del quickstart.md (aislamiento RLS) pasa con dos tenants.

---

## Phase 9: Polish y ValidaciÃ³n Final

**Purpose**: Corte transversal â€” calidad, rendimiento, PWA score, deployment.

- [x] T055 [P] Run Lighthouse PWA audit (target â‰¥ 90 mobile), adjust Service Worker caching rules for offline routes â†’ app/sw.ts
- [x] T056 [P] Resolve all TypeScript strict mode errors (`tsc --noEmit`) â†’ tsconfig.json + all source files
- [x] T057 Run all 5 quickstart.md validation scenarios and confirm pass â†’ manual + `npm run test:semaforo`
- [x] T058 [P] Configure Vercel project: env variables, build settings, preview deployment â†’ vercel.json o vercel.ts
- [x] T059 Verify RLS isolation with two tenants (Escenario 4 quickstart.md) â€” confirm 0 cross-tenant leaks

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) â†’ no deps, empieza ya
Phase 2 (Foundational) â†’ requiere Phase 1 completa, BLOQUEA todas las US
Phase 3 (US2 SemÃ¡foro) â†’ requiere Phase 2 â€” independiente de otras US
Phase 4 (US1 Captura voz) â†’ requiere Phase 2 + Phase 3 (semaforo.ts)
Phase 5 (US3 Dashboard) â†’ requiere Phase 2 + Phase 4 (datos de sesiones)
Phase 6 (US4 RecepciÃ³n) â†’ requiere Phase 2 (independiente de US1-US3)
Phase 7 (US5 Evidencia) â†’ requiere Phase 4 (extiende CountForm)
Phase 8 (US6 Admin) â†’ requiere Phase 2 + Phase 6 (aprobaciÃ³n incluye embeddings)
Phase 9 (Polish) â†’ requiere todas las fases anteriores
```

### User Story Dependencies

| User Story | Depende de | Independiente de |
|------------|------------|-----------------|
| US2 SemÃ¡foro (Phase 3) | Foundational | US1, US3, US4, US5, US6 |
| US1 Captura voz (Phase 4) | Foundational + US2 | US3, US4, US5, US6 |
| US3 Dashboard (Phase 5) | Foundational + US1 (datos) | US4, US5, US6 |
| US4 RecepciÃ³n (Phase 6) | Foundational | US1, US2, US3, US5 |
| US5 Evidencia (Phase 7) | US1 (CountForm) | US3, US4, US6 |
| US6 Admin (Phase 8) | Foundational + US4 (embeddings) | US1, US2, US3, US5 |

### Dentro de cada User Story

1. Tests (si aplica) â†’ deben fallar antes de implementar
2. Componentes base â†’ antes de pÃ¡ginas
3. Queries/sync â†’ antes de wiring
4. PÃ¡gina/feature â†’ al final de cada story

### Oportunidades de Paralelismo

- **Phase 1**: T002, T003, T004, T005 corren en paralelo tras T001
- **Phase 2**: T007, T008, T009, T013, T014, T015 en paralelo (tras T006)
- **Phase 2**: T010, T011 â†’ esperar T006-T009 (dependen del schema)
- **Phase 3**: T019, T021, T022 en paralelo; T020 espera T019
- **Phase 4**: T023, T024, T027 en paralelo; T025 â†’ T026 â†’ T028
- **Phase 6**: T037, T042 en paralelo; T038 â†’ T039 â†’ T040 â†’ T041
- **Phase 8**: T049, T053 en paralelo; T050 â†’ T051 â†’ T052

---

## Parallel Example: Phase 2 Foundational

```bash
# Batch 1 â€” migrations sin dependencias entre sÃ­:
Task: T006 migration 001 (tenants, sectors, profiles, products)
Task: T007 migration 002 (audit_sessions, product_counts)
Task: T008 migration 003 (receptions, reception_items)
Task: T009 migration 004 (pending_products)

# Batch 2 â€” esperar Batch 1:
Task: T010 migration 005 (RLS policies)
# luego:
Task: T011 migration 006 (functions SECURITY DEFINER)

# Paralelo con migraciones:
Task: T013 supabase.ts + supabase-server.ts
Task: T014 lib/db.ts (Dexie schema)
Task: T015 API route stubs
```

## Parallel Example: User Story 2 (SemÃ¡foro)

```bash
# Batch 1 â€” test primero (debe fallar):
Task: T019 lib/__tests__/semaforo.test.ts

# Batch 2 â€” implementar + paralelos:
Task: T020 lib/semaforo.ts (make tests pass)
Task: T021 components/SemaforoChip.tsx (paralelo)
Task: T022 lib/sync.ts stubs (paralelo)
```

---

## Implementation Strategy

### MVP First (US2 + US1 â€” Fases 1â€“4)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÃTICO â€” bloquea todo)
3. Completar Phase 3: US2 SemÃ¡foro puro (tests primero)
4. Completar Phase 4: US1 Captura por voz offline
5. **STOP y VALIDAR**: Escenarios 1 y 2 de quickstart.md
6. Demo con cliente: auditor completa una bodega sin internet

### Incremental Delivery

1. Setup + Foundational â†’ base lista
2. US2 â†’ semÃ¡foro funciona (demo: clasificar productos en terminal)
3. US1 â†’ captura offline completa (demo: MVP con cliente)
4. US3 â†’ dashboard supervisor (demo: visibilidad en tiempo real)
5. US4 â†’ recepciÃ³n por factura (demo: eliminaciÃ³n doble digitaciÃ³n)
6. US5 â†’ evidencia fotogrÃ¡fica (demo: trazabilidad sanitaria)
7. US6 â†’ admin + catÃ¡logo (demo: onboarding de hotel nuevo)

### Parallel Team Strategy (si hay 2+ desarrolladores)

Tras completar Phases 1â€“3:

- **Dev A**: Phase 4 (US1 Captura voz)
- **Dev B**: Phase 6 (US4 RecepciÃ³n facturas) â€” independiente de US1

Ambos pueden avanzar simultÃ¡neamente ya que usan archivos distintos.

---

## Notes

- `[P]` = archivos distintos, sin dependencias de tareas incompletas
- `[USx]` = traza la tarea a su user story para testing independiente
- **Principio IV (offline-first)**: Toda UI debe tener estado explÃ­cito de cola â€” nunca spinner infinito
- **Principio V (seguridad alimentaria)**: `lib/semaforo.ts` implementado en Phase 3 antes de cualquier UI
- **Principio VII (sin aprobaciÃ³n)**: `pending_products` nunca va a `products` sin T051/T052 (admin aprueba)
- Commit after each task or logical group (una US = un PR)
- Validar con quickstart.md al terminar cada phase

---

## Resumen de conteo

| Phase | Tareas | User Story |
|-------|--------|------------|
| Phase 1: Setup | 5 (T001â€“T005) | â€” |
| Phase 2: Foundational | 13 (T006â€“T018) | â€” |
| Phase 3: SemÃ¡foro | 4 (T019â€“T022) | US2 (P1) |
| Phase 4: Captura voz | 9 (T023â€“T031) | US1 (P1) |
| Phase 5: Dashboard | 5 (T032â€“T036) | US3 (P2) |
| Phase 6: RecepciÃ³n | 8 (T037â€“T044) | US4 (P2) |
| Phase 7: Evidencia | 4 (T045â€“T048) | US5 (P2) |
| Phase 8: Admin | 6 (T049â€“T054) | US6 (P3) |
| Phase 9: Polish | 5 (T055â€“T059) | â€” |
| **Total** | **59 tareas** | **6 user stories** |
