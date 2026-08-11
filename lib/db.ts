import Dexie, { type EntityTable } from 'dexie'

// ================================================================
// Types
// ================================================================

export interface ProductCache {
  id: string
  tenant_id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  requiere_fecha_vencimiento: boolean
  embedding: number[] | null  // Float32Array serialized as plain array
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

  constructor() {
    super('auditoria-ia-v1')
    this.version(1).stores({
      products:    'id, tenant_id, nombre, subtipo, updated_at',
      audioQueue:  'id, sessionId, status, recordedAt',
      photoQueue:  'id, tipo, status, tenantId',
      countQueue:  'local_id, session_id, tenant_id, status',
    })
  }
}

export const db = new AuditorIADB()
