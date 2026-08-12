import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { evaluarYMaterializar } from '@/lib/reglas-evaluate'

// GET /api/lotes?color=ROJO  → lotes con su estado (para inventario)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const color = request.nextUrl.searchParams.get('color')

  const { data, error: qErr } = await supabase
    .from('lotes')
    .select('id, codigo_lote, cantidad, fecha_vencimiento, estado_cuarentena, created_at, products(nombre, unidad_medida), lote_estado(color, detalle, bloqueo_salida, bloqueo_ingreso, evaluado_en)')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(500)

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  let lotes = data ?? []
  if (color) lotes = lotes.filter((l) => (Array.isArray(l.lote_estado) ? l.lote_estado[0]?.color : (l.lote_estado as { color?: string } | null)?.color) === color)

  return NextResponse.json({ lotes })
}

// POST /api/lotes  → crea lote y lo evalúa. Body: {producto_id, cantidad, fecha_vencimiento,
//   fecha_recepcion, fecha_produccion, codigo_lote, proveedor_id, estado_cuarentena}
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string
  const body = await request.json().catch(() => null)
  if (!body?.producto_id) return NextResponse.json({ error: 'MISSING_PRODUCTO' }, { status: 400 })

  const { data: lote, error: insErr } = await supabase
    .from('lotes')
    .insert({
      tenant_id: tenantId,
      producto_id: body.producto_id,
      codigo_lote: body.codigo_lote ?? null,
      proveedor_id: body.proveedor_id ?? null,
      ubicacion_id: body.ubicacion_id ?? null,
      equipo_id: body.equipo_id ?? null,
      cantidad: typeof body.cantidad === 'number' ? body.cantidad : Number(body.cantidad) || 0,
      fecha_recepcion: body.fecha_recepcion ?? new Date().toISOString(),
      fecha_produccion: body.fecha_produccion ?? null,
      fecha_vencimiento: body.fecha_vencimiento ?? null,
      fecha_apertura: body.fecha_apertura ?? null,
      estado_cuarentena: body.estado_cuarentena ?? 'LIBRE',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insErr || !lote) return NextResponse.json({ error: insErr?.message ?? 'INSERT_FAILED' }, { status: 500 })

  const estado = await evaluarYMaterializar(supabase, lote.id, tenantId)
  return NextResponse.json({ id: lote.id, estado }, { status: 201 })
}
