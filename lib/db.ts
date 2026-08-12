import Dexie, { type EntityTable } from 'dexie'
import type { Regla, TipoRegla } from './reglas-engine'

// ================================================================
// Types
// ================================================================

export interface ProductCache {
  id: string
  tenant_id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  categoria_id: string | null   // necesario para especificidad del motor (§5.2.1)
  requiere_fecha_vencimiento: boolean
  embedding: number[] | null  // Float32Array serialized as plain array
  updated_at: string
}

// Copia cacheada de las reglas vigentes del tenant, para evaluar el semáforo
// offline con el mismo motor que el servidor (spec §5.2.5). Un registro por tenant.
export interface ReglasCache {
  tenant_id: string
  reglas: Regla[]
  tiposActivos: TipoRegla[]
  categorias: { id: string; parent_id: string | null }[]
  updated_at: string
}

export interface AudioQueueItem {
  id: string          // = local_id of the count this audio belongs to
  blob: Blob
  mimeType: string    // MUST preserve original MediaRecorder mimeType (no conversion)
  recordedAt: number  // timestamp ms
  sessionId: string
  productHint?: string
  status: 'pending' | 'processing' | 'error'
  attempts: number
  lastError?: string
}

export interface PhotoQueueItem {
  id: string
  blob: Blob
  tipo: 'evidencia' | 'factura'
  localCountId?: string   // for evidencia
  receptionId?: string    // for factura
  tenantId: string
  sessionId?: string
  status: 'pending' | 'processing' | 'error'
  attempts: number
  lastError?: string
}

export interface CountQueueItem {
  local_id: string
  session_id: string
  tenant_id: string
  data: Record<string, unknown>
  status: 'pending' | 'syncing' | 'error'
  attempts: number
  last_error?: string
  created_at: string
}

// ================================================================
// Database schema
// ================================================================

class AuditorIADB extends Dexie {
  products!: EntityTable<ProductCache, 'id'>
  audioQueue!: EntityTable<AudioQueueItem, 'id'>
  photoQueue!: EntityTable<PhotoQueueItem, 'id'>
  countQueue!: EntityTable<CountQueueItem, 'local_id'>
  reglasCache!: EntityTable<ReglasCache, 'tenant_id'>

  constructor() {
    super('auditoria-ia-v1')
    this.version(1).stores({
      products:    'id, tenant_id, nombre, subtipo, updated_at',
      audioQueue:  'id, sessionId, status, recordedAt',
      photoQueue:  'id, tipo, status, tenantId',
      countQueue:  'local_id, session_id, tenant_id, status',
    })
    // v2: caché de reglas para semáforo offline (§5.2.5) + categoria_id en products.
    this.version(2).stores({
      reglasCache: 'tenant_id',
    })
  }
}

export const db = new AuditorIADB()
