import type { SupabaseClient } from '@supabase/supabase-js'

// All queries are automatically scoped to the caller's tenant via RLS.

export interface SessionSummary {
  id: string
  bodega: string
  estado: string
  opened_at: string
  closed_at: string | null
  verde: number
  amarillo: number
  naranja: number
  rojo: number
  gris: number
  total: number
}

export interface AlertItem {
  id: string
  session_id: string
  bodega: string
  product_name: string
  cantidad: number
  unidad_medida: string
  semaforo_color: 'rojo' | 'naranja' | 'amarillo'
  semaforo_razon: string
  semaforo_accion: string
  created_at: string
}

export interface PendingProduct {
  id: string
  nombre_sugerido: string
  unidad_sugerida: string
  subtipo_sugerido: string | null
  origen: 'factura' | 'manual'
  match_candidates: MatchCandidate[] | null
  created_at: string
}

export interface MatchCandidate {
  product_id: string
  nombre: string
  score: number
}

// Fetch active sessions enriched with per-color counts.
// RLS ensures tenant isolation automatically.
export async function getActiveSessions(supabase: SupabaseClient): Promise<SessionSummary[]> {
  const { data: sessions } = await supabase
    .from('audit_sessions')
    .select('id, bodega, estado, opened_at, closed_at')
    .eq('estado', 'abierta')
    .order('opened_at', { ascending: false })
    .limit(20)

  if (!sessions?.length) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: counts } = await supabase
    .from('product_counts')
    .select('session_id, semaforo_color')
    .in('session_id', sessionIds)

  type Tally = { verde: number; amarillo: number; naranja: number; rojo: number; gris: number }
  const empty = (): Tally => ({ verde: 0, amarillo: 0, naranja: 0, rojo: 0, gris: 0 })
  const tally: Record<string, Tally> = {}
  for (const row of counts ?? []) {
    const { session_id, semaforo_color } = row as { session_id: string; semaforo_color: keyof Tally }
    if (!tally[session_id]) tally[session_id] = empty()
    if (semaforo_color in tally[session_id]) tally[session_id][semaforo_color]++
  }

  return sessions.map((s) => {
    const t = tally[s.id] ?? empty()
    return { ...s, ...t, total: t.verde + t.amarillo + t.naranja + t.rojo + t.gris }
  })
}

// Fetch product counts for a single session with product names.
export async function getSessionCounts(supabase: SupabaseClient, sessionId: string) {
  const { data } = await supabase
    .from('product_counts')
    .select(`
      id, local_id, cantidad, unidad_medida, fecha_vencimiento,
      estado_empaque, observacion_visual,
      semaforo_color, semaforo_razon, semaforo_accion,
      semaforo_estrategia_circular, semaforo_ods,
      semaforo_metodo_calculo, dias_restantes,
      transcripcion_voz, captura_metodo, foto_evidencia_url, created_at,
      products ( nombre, subtipo )
    `)
    .eq('session_id', sessionId)
    .order('semaforo_color', { ascending: true }) // rojo first alphabetically? no — order by created_at desc
    .order('created_at', { ascending: false })

  return data ?? []
}

// Recent alerts (rojo + amarillo) across all sessions in last 24h.
export async function getAlertSummary(supabase: SupabaseClient, limit = 20): Promise<AlertItem[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('product_counts')
    .select(`
      id, session_id, cantidad, unidad_medida,
      semaforo_color, semaforo_razon, semaforo_accion, created_at,
      products ( nombre ),
      audit_sessions ( bodega )
    `)
    .in('semaforo_color', ['rojo', 'naranja', 'amarillo'])
    .gte('created_at', since)
    .order('semaforo_color', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    session_id: row.session_id as string,
    bodega: (row.audit_sessions as { bodega: string } | null)?.bodega ?? '—',
    product_name: (row.products as { nombre: string } | null)?.nombre ?? 'Desconocido',
    cantidad: row.cantidad as number,
    unidad_medida: row.unidad_medida as string,
    semaforo_color: row.semaforo_color as 'rojo' | 'naranja' | 'amarillo',
    semaforo_razon: row.semaforo_razon as string,
    semaforo_accion: row.semaforo_accion as string,
    created_at: row.created_at as string,
  }))
}

// Pending products awaiting admin/supervisor approval.
export async function getPendingProducts(supabase: SupabaseClient): Promise<PendingProduct[]> {
  const { data } = await supabase
    .from('pending_products')
    .select('id, nombre_sugerido, unidad_sugerida, subtipo_sugerido, origen, match_candidates, created_at')
    .is('aprobado_por', null)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as PendingProduct[]
}

// Generate a signed URL for a private storage bucket (1h default expiry).
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: 'evidence-photos' | 'invoice-photos',
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}
