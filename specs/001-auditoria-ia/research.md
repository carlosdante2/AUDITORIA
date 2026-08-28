# Research: Fresko — Decisiones Técnicas

**Feature**: 001-auditoria-ia
**Date**: 2026-08-09
**Status**: Complete — todos los NEEDS CLARIFICATION resueltos

---

## 1. PWA Setup en Next.js 15 App Router

**Decision**: `serwist` (ex-`next-pwa` refactorizado para App Router)

**Rationale**: `@ducanh2912/next-pwa` y el `next-pwa` original tienen soporte
limitado en Next.js 15 App Router porque asumen la estructura de `pages/`.
`serwist` es el sucesor oficial, diseñado desde cero para App Router y Service
Workers modernos (Workbox 7+). Soporta precaching de rutas App Router,
runtime caching configurable y background sync.

**Alternatives considered**:
- `@ducanh2912/next-pwa`: funciona pero requiere workarounds para App Router;
  mantenimiento menos activo desde 2025.
- Service Worker manual: más control pero duplica trabajo que Serwist resuelve.

**Implementation notes**:
- `next.config.ts` envuelto con `withSerwist({ swSrc: 'app/sw.ts' })`
- Precache: rutas de captura, catálogo cacheado localmente
- Runtime cache: imágenes de Supabase Storage con `StaleWhileRevalidate`

---

## 2. Offline Matching — catálogo en IndexedDB

**Decision**: Dexie.js 4 con cosine similarity en cliente para ≤500 productos

**Rationale**: Con un máximo de 500 productos por tenant, el catálogo completo
con embeddings de 1536 dimensiones ocupa ~3MB en memoria (500 × 1536 × 4 bytes
float32 ≈ 3.1MB), perfectamente manejable en IndexedDB y en memoria JS para
el cálculo de similitud. No se necesita librería especial: dot product +
magnitudes en un loop de 500 items tarda <5ms en móvil mid-range.

**Alternatives considered**:
- `hnswlib-wasm`: HNSW aproximado, necesario solo para >10k vectores.
  Overkill para 500 productos y agrega 2MB+ al bundle.
- Matching solo online (pgvector): viola el principio IV (offline-first).
- `vectordb` en WASM: misma conclusión que hnswlib, innecesario.

**Implementation notes**:
- Al login: `GET /api/catalog` → guarda en Dexie tabla `products` con campo
  `embedding` como `Float32Array`.
- En matching offline: calcula cosine similarity para todos los productos,
  devuelve top-3 ordenados por score.
- Umbral offline: si score < 0.70, muestra top-3 para elección manual.
- Umbral online (pgvector): `embedding <=> $query_embedding < 0.25`
  (distancia coseno, equivale a similitud > 0.75).

---

## 3. Cola de Audio Offline (MediaRecorder)

**Decision**: IndexedDB blob store + flush por evento `online` + flush en arranque

**Rationale**: MediaRecorder produce blobs en formato dependiente del navegador.
Conservar el mimeType original y enviarlo a Groq evita problemas de
compatibilidad — Groq Whisper acepta webm/opus y mp4/aac directamente.
La cola debe vaciarse en dos momentos: al detectar el evento `online` del
navegador (reconexión) y al abrir la app (arranque), no por polling temporal,
para minimizar latencia y batería.

**Alternatives considered**:
- Background Sync API (Service Worker): soportada solo en Chrome/Android;
  no disponible en iOS Safari. Descartada por cobertura incompleta.
- Convertir a WAV en cliente: desperdicia CPU y tiempo; Groq lo maneja
  nativamente en los formatos originales.
- Reintentos temporizados (setInterval): introduce latencia innecesaria
  cuando el usuario vuelve a tener red.

**Implementation notes**:
```typescript
// Schema Dexie
interface AudioQueueItem {
  id: string;           // local_id del conteo
  blob: Blob;
  mimeType: string;     // preservar del MediaRecorder
  recordedAt: number;
  sessionId: string;
  productHint?: string; // descripción offline para UX
}

// Flush triggers
window.addEventListener('online', flushAudioQueue);
// En app/layout.tsx: useEffect(() => { flushAudioQueue() }, [])
```

---

## 4. Semáforo Local — `lib/semaforo.ts`

**Decision**: Función TypeScript pura, determinista, sin efectos secundarios ni red

**Rationale**: El semáforo debe correr en <100ms offline. La lógica es un árbol
de decisión determinista basado en `SEMAFORO_v2_accion_ODS.md`: clasifica por
subtipo, calcula días_restantes, aplica reglas de prioridad (empaque > observación
> fecha > color_base > ajustes). Al ser una función pura es trivialmente testeable
con Vitest sin mocks.

**Alternatives considered**:
- Llamada a Claude en cada evaluación: viola principio IV (offline-first)
  y principio V (seguridad alimentaria no puede depender de disponibilidad de red).
- WASM Rust para rendimiento: innecesario, JS maneja el árbol de decisión
  en <1ms por ítem.

**Input/Output contract**:
```typescript
interface SemaforoInput {
  subtipo_producto: string;
  fecha_vencimiento: string | null;   // YYYY-MM-DD
  fecha_hoy: string;                   // YYYY-MM-DD
  requiere_fecha_segun_norma: 'si' | 'no';
  estado_empaque: 'intacto' | 'dano_leve' | 'roto_abierto_fuga';
  observacion_visual: 'normal' | 'dudoso' | 'no_conforme';
  fecha_recepcion_o_compra?: string | null; // para frutas/verduras
}

interface SemaforoOutput {
  categoria_asignada: 'perecedero_critico' | 'perecedero_intermedio' | 'no_perecedero';
  dias_restantes: number | null;
  metodo_calculo: 'fecha_documentada' | 'estimado_por_recepcion' | 'no_aplica';
  color: 'verde' | 'amarillo' | 'rojo';
  razon: string;                        // max 150 chars
  accion_sugerida: string;              // snake_case
  estrategia_economia_circular: string | null;
  ods_relacionados: string[];
}
```

---

## 5. Embeddings — Generación y Almacenamiento

**Decision**: `text-embedding-3-small` (OpenAI) via server action en Next.js,
almacenado en Supabase `products.embedding vector(1536)` con pgvector

**Rationale**: `text-embedding-3-small` tiene la mejor relación
costo/calidad para español en nombres cortos de productos alimenticios.
Costo: ~$0.02 por millón de tokens — para 500 productos de ~5 tokens cada uno
= $0.00005 por carga completa de catálogo (despreciable). La generación ocurre
en servidor (Next.js Route Handler o Supabase Edge Function) para no exponer
la API key en cliente.

**Alternatives considered**:
- `text-embedding-3-large` (3072 dim): mayor calidad marginal no justifica
  2x costo y 2x tamaño en IndexedDB.
- Modelos open source (sentence-transformers vía WASM): calidad inferior en
  español técnico/alimenticio; complejidad de deployer.
- Gemini embeddings: buena opción alternativa, pero OpenAI ya está en el stack.

**Trigger de generación**:
- Al aprobar un `producto_pendiente` → genera embedding → INSERT en `products`
- Al importar CSV/Excel → genera embeddings en batch (máx. 500 por request)
- Al actualizar nombre o unidad de un producto → regenera embedding

---

## 6. Supabase Auth — Roles y tenant_id

**Decision**: Supabase Auth + `app_metadata` con función `get_my_tenant_id()` SECURITY DEFINER

**Rationale**: `app_metadata` es modificable únicamente con `SERVICE_ROLE_KEY`,
lo que previene escalación de privilegios (lección aprendida en ALMACENERO DIGITAL).
La función `get_my_tenant_id()` SECURITY DEFINER permite que las RLS policies
lean el tenant del usuario autenticado sin exponer la lógica de `app_metadata`
en cada policy.

**Schema de app_metadata**:
```json
{
  "tenant_id": "uuid",
  "rol": "auditor | supervisor | admin"
}
```

**RLS pattern** (ejemplo para `products`):
```sql
CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = get_my_tenant_id());
```

---

## 7. Supabase Storage — Fotos

**Decision**: Bucket privado `evidence-photos` con URLs firmadas (1h expiración)
+ bucket `invoice-photos` para facturas

**Rationale**: Las fotos no deben ser públicas — contienen información operativa
sanitaria del hotel. URLs firmadas con expiración corta minimizan el riesgo de
exposición si una URL se comparte accidentalmente.

**Path convention**:
```
evidence-photos/{tenant_id}/{session_id}/{count_local_id}.jpg
invoice-photos/{tenant_id}/{reception_id}/factura.jpg
```

**Offline handling**:
- Foto comprimida a ≤2MB (canvas.toBlob con quality 0.7) antes de guardar
- Guardada en Dexie como Blob con referencia al `local_id` del conteo
- Al sincronizar: upload a Storage → UPDATE product_counts SET foto_evidencia_url

---

## 8. Next.js Route Handlers vs Supabase Edge Functions

**Decision**: Mixto — Route Handlers para relay rápido (Whisper, Vision, match);
Edge Functions para lógica de negocio que requiere SERVICE_ROLE_KEY (embeddings,
aprobación de productos, sync de cola)

**Rationale**: Route Handlers en Vercel tienen cold start menor y están
co-ubicados con el frontend. Edge Functions de Supabase son necesarias cuando
se necesita SERVICE_ROLE_KEY sin exponerla en Vercel env (aunque ambas lo
soportan, Supabase EF es más natural para operaciones de DB con bypass RLS).

**Division**:
- `app/api/voz/route.ts` — relay a Groq Whisper (stateless, rápido)
- `app/api/vision/route.ts` — relay a Groq Vision (stateless)
- `app/api/match/route.ts` — pgvector similarity search
- `app/api/semaforo-ia/route.ts` — Claude haiku insights (optional, online-only)
- `supabase/functions/embeddings/` — generación batch, usa SERVICE_ROLE_KEY
- `supabase/functions/sync/` — procesamiento de cola offline, upsert con dedup

---

## 9. Dedup de Conteos Offline

**Decision**: `local_id` UUID generado en cliente, `UNIQUE` constraint en DB,
INSERT con `ON CONFLICT (local_id) DO NOTHING`

**Rationale**: Si el cliente sincroniza y el servidor ya tiene el conteo (por
un reintento anterior), el INSERT silenciosamente no hace nada. El `local_id`
es generado con `crypto.randomUUID()` en el momento de confirmar el conteo,
antes de cualquier intento de sync.

---

## 10. Testing Strategy

**Decision**: Vitest (unit) + Playwright (e2e PWA)

**Rationale**:
- Vitest: tests unitarios de `semaforo.ts` (sin red, sin DOM, puro TypeScript).
  Crítico por la constitución: `semaforo.ts` NUNCA hace red y debe ser testeable.
- Playwright: prueba el flujo offline completo (intercepta red, verifica que
  la UI muestra estado correcto, verifica sync al reconectar).

**Critical test cases**:
1. `semaforo.ts`: todos los ejemplos de `SEMAFORO_v2_accion_ODS.md` como fixtures
2. Cola de audio: offline → confirmar → reconectar → verificar procesamiento
3. Dedup: mismo `local_id` enviado dos veces → solo un registro en DB
4. RLS: usuario de tenant A no puede leer productos de tenant B
