import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_BATCH = 50

interface CountPayload {
  local_id: string
  session_id: string
  producto_id: string
  cantidad: number
  unidad_medida: string
  fecha_vencimiento?: string | null
  fecha_recepcion_o_compra?: string | null
  estado_empaque: string
  observacion_visual: string
  semaforo_color: string
  semaforo_razon?: string
  semaforo_accion?: string
  semaforo_estrategia_circular?: string | null
  semaforo_ods?: string[]
  semaforo_bloqueo_salida?: boolean
  semaforo_bloqueo_ingreso?: boolean
  semaforo_detalle?: unknown[]
  // Legado del motor viejo (opcional):
  semaforo_metodo_calculo?: string | null
  dias_restantes?: number | null
  transcripcion_voz?: string | null
  captura_metodo?: string
  created_at?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Create client with user JWT for identity verification
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) {
    return new Response(JSON.stringify({ error: 'TENANT_NOT_CONFIGURED' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: { counts?: CountPayload[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const counts = body.counts ?? []
  if (!Array.isArray(counts) || counts.length === 0) {
    return new Response(JSON.stringify({ processed: 0, skipped: 0, errors: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (counts.length > MAX_BATCH) {
    return new Response(JSON.stringify({ error: 'BATCH_TOO_LARGE', max: MAX_BATCH }), {
      status: 422,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Service role client for the actual inserts (bypasses RLS for efficiency)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Validate all session_ids belong to this tenant before inserting
  const sessionIds = [...new Set(counts.map((c) => c.session_id))]
  const { data: validSessions } = await serviceClient
    .from('audit_sessions')
    .select('id')
    .in('id', sessionIds)
    .eq('tenant_id', tenantId)

  const validSessionSet = new Set((validSessions ?? []).map((s: { id: string }) => s.id))

  let processed = 0
  let skipped = 0
  const errors: Array<{ local_id: string; error: string; message: string }> = []

  for (const count of counts) {
    if (!validSessionSet.has(count.session_id)) {
      errors.push({
        local_id: count.local_id,
        error: 'SESSION_NOT_FOUND',
        message: 'La sesión no existe o no pertenece al tenant',
      })
      continue
    }

    const row = {
      local_id: count.local_id,
      session_id: count.session_id,
      tenant_id: tenantId,
      producto_id: count.producto_id,
      cantidad: count.cantidad,
      unidad_medida: count.unidad_medida,
      fecha_vencimiento: count.fecha_vencimiento ?? null,
      fecha_recepcion_o_compra: count.fecha_recepcion_o_compra ?? null,
      estado_empaque: count.estado_empaque,
      observacion_visual: count.observacion_visual,
      semaforo_color: count.semaforo_color,
      semaforo_razon: count.semaforo_razon ?? '',
      semaforo_accion: count.semaforo_accion ?? '',
      semaforo_estrategia_circular: count.semaforo_estrategia_circular ?? null,
      semaforo_ods: count.semaforo_ods ?? [],
      semaforo_bloqueo_salida: count.semaforo_bloqueo_salida ?? false,
      semaforo_bloqueo_ingreso: count.semaforo_bloqueo_ingreso ?? false,
      semaforo_detalle: count.semaforo_detalle ?? [],
      semaforo_metodo_calculo: count.semaforo_metodo_calculo ?? null,
      dias_restantes: count.dias_restantes ?? null,
      transcripcion_voz: count.transcripcion_voz ?? null,
      captura_metodo: count.captura_metodo ?? 'manual',
      created_at: count.created_at ?? new Date().toISOString(),
    }

    const { error: insertError, status } = await serviceClient
      .from('product_counts')
      .insert(row)
      .select('id')
      .single()

    if (!insertError) {
      processed++
    } else if (insertError.code === '23505') {
      // Unique violation on local_id — already synced (dedup OK)
      skipped++
    } else {
      errors.push({
        local_id: count.local_id,
        error: 'INSERT_FAILED',
        message: insertError.message,
      })
    }
  }

  const responseStatus = errors.length > 0 && processed === 0 ? 207 : 200
  return new Response(
    JSON.stringify({ processed, skipped, errors }),
    {
      status: responseStatus,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  )
})
