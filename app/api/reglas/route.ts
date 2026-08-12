import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validarUmbrales, type TipoRegla, type Umbral } from '@/lib/reglas-engine'
import { insertarUmbrales } from '@/lib/reglas-data'
import { reevaluarTenant } from '@/lib/reglas-evaluate'

// GET /api/reglas?tipo=&ambito=  → reglas vigentes con umbrales
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const tipo = request.nextUrl.searchParams.get('tipo')
  const ambito = request.nextUrl.searchParams.get('ambito')

  let q = supabase
    .from('reglas')
    .select('id, tipo, ambito, ambito_id, nombre, version, vigente_desde, regla_umbrales(id, color, operador, valor_min, valor_max, valor_text, unidad, accion, mensaje, orden)')
    .is('vigente_hasta', null)
    .eq('activa', true)
    .order('tipo', { ascending: true })

  if (tipo) q = q.eq('tipo', tipo)
  if (ambito) q = q.eq('ambito', ambito)

  const { data, error: qErr } = await q
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
  return NextResponse.json({ reglas: data ?? [] })
}

// POST /api/reglas  → crea regla (admin). Body: {tipo, ambito, ambito_id, nombre, umbrales[]}
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (user.app_metadata?.rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const tenantId = user.app_metadata?.tenant_id as string
  const body = await request.json().catch(() => null)
  if (!body?.tipo || !body?.ambito || !body?.nombre || !Array.isArray(body?.umbrales)) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  const tipo = body.tipo as TipoRegla
  const umbrales = body.umbrales as Umbral[]
  const forzar = body.forzar === true

  // Validación (§3)
  const { errores, advertencias } = validarUmbrales(tipo, umbrales)
  if (errores.length > 0) return NextResponse.json({ error: 'VALIDATION', errores, advertencias }, { status: 422 })
  if (advertencias.length > 0 && !forzar) {
    return NextResponse.json({ error: 'CONFIRM_REQUIRED', advertencias }, { status: 409 })
  }

  // Insert regla (unique index impide dos vigentes por tipo/ambito/ambito_id)
  const { data: regla, error: insErr } = await supabase
    .from('reglas')
    .insert({
      tenant_id: tenantId, tipo, ambito: body.ambito,
      ambito_id: body.ambito === 'GLOBAL' ? null : body.ambito_id,
      nombre: body.nombre, version: 1, creado_por: user.id,
    })
    .select('id')
    .single()

  if (insErr) {
    const dup = insErr.code === '23505'
    return NextResponse.json(
      { error: dup ? 'YA_EXISTE' : insErr.message, message: dup ? 'Ya hay una regla vigente para ese tipo y ámbito. Edítala para crear una nueva versión.' : insErr.message },
      { status: dup ? 409 : 500 }
    )
  }

  await insertarUmbrales(supabase, regla.id, umbrales)
  await reevaluarTenant(supabase, tenantId).catch(() => {}) // re-evalúa inventario con la nueva regla
  return NextResponse.json({ id: regla.id, advertencias }, { status: 201 })
}
