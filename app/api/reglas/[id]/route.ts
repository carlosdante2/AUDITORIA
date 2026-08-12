import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validarUmbrales, type TipoRegla, type Umbral } from '@/lib/reglas-engine'
import { insertarUmbrales } from '@/lib/reglas-data'

// PUT /api/reglas/:id → versiona (cierra la actual, crea version+1). NO sobreescribe.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (user.app_metadata?.rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const tenantId = user.app_metadata?.tenant_id as string
  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.umbrales)) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })

  // Regla actual
  const { data: actual } = await supabase
    .from('reglas')
    .select('id, tipo, ambito, ambito_id, nombre, version')
    .eq('id', id)
    .single()
  if (!actual) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const tipo = actual.tipo as TipoRegla
  const umbrales = body.umbrales as Umbral[]
  const forzar = body.forzar === true

  const { errores, advertencias } = validarUmbrales(tipo, umbrales)
  if (errores.length > 0) return NextResponse.json({ error: 'VALIDATION', errores, advertencias }, { status: 422 })
  if (advertencias.length > 0 && !forzar) return NextResponse.json({ error: 'CONFIRM_REQUIRED', advertencias }, { status: 409 })

  // 1. Cerrar versión actual (libera el índice único de "vigente")
  await supabase.from('reglas').update({ vigente_hasta: new Date().toISOString() }).eq('id', id)

  // 2. Crear nueva versión vigente
  const { data: nueva, error: insErr } = await supabase
    .from('reglas')
    .insert({
      tenant_id: tenantId, tipo, ambito: actual.ambito, ambito_id: actual.ambito_id,
      nombre: body.nombre ?? actual.nombre, version: (actual.version as number) + 1, creado_por: user.id,
    })
    .select('id')
    .single()

  if (insErr || !nueva) {
    // rollback best-effort: reabrir la anterior
    await supabase.from('reglas').update({ vigente_hasta: null }).eq('id', id)
    return NextResponse.json({ error: insErr?.message ?? 'INSERT_FAILED' }, { status: 500 })
  }

  await insertarUmbrales(supabase, nueva.id, umbrales)
  return NextResponse.json({ id: nueva.id, version: (actual.version as number) + 1, advertencias })
}

// DELETE /api/reglas/:id → soft: activa=false, vigente_hasta=now
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (user.app_metadata?.rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { error: upErr } = await supabase
    .from('reglas')
    .update({ activa: false, vigente_hasta: new Date().toISOString() })
    .eq('id', id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
