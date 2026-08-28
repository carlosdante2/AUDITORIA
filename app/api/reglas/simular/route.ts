import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { evaluarLote, type LoteEval } from '@/lib/reglas-engine'
import { cargarReglasActivas, categoriaChain } from '@/lib/reglas-data'

// POST /api/reglas/simular
// Body: { producto_id?, categoria_id?, fecha_vencimiento, fecha_apertura,
//         estado_cuarentena, codigo_lote, proveedor_id, cantidad }
// Resp: { color_final, bloqueo_salida, bloqueo_ingreso, detalle[] }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (user.app_metadata?.rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = await request.json().catch(() => ({}))

  // Resolver categoría: la del producto si viene producto_id, si no la explícita
  let categoriaId: string | null = body.categoria_id ?? null
  // Por defecto exige fecha; el body puede forzarlo para simular productos exentos.
  let requiereFecha: boolean = body.requiere_fecha_vencimiento ?? true
  if (body.producto_id) {
    const { data: prod } = await supabase
      .from('products').select('categoria_id, requiere_fecha_vencimiento').eq('id', body.producto_id).single()
    categoriaId = (prod?.categoria_id as string | null) ?? categoriaId
    if (prod?.requiere_fecha_vencimiento != null) requiereFecha = prod.requiere_fecha_vencimiento as boolean
  }

  const [{ reglas, tiposActivos }, chain] = await Promise.all([
    cargarReglasActivas(supabase),
    categoriaChain(supabase, categoriaId),
  ])

  const lote: LoteEval = {
    producto_id: body.producto_id ?? '00000000-0000-0000-0000-000000000000',
    categoria_id: categoriaId,
    codigo_lote: body.codigo_lote ?? null,
    proveedor_id: body.proveedor_id ?? null,
    fecha_vencimiento: body.fecha_vencimiento ?? null,
    fecha_apertura: body.fecha_apertura ?? null,
    estado_cuarentena: body.estado_cuarentena ?? 'LIBRE',
    cantidad: typeof body.cantidad === 'number' ? body.cantidad : 0,
    requiere_fecha_vencimiento: requiereFecha,
  }

  const now = new Date()
  const hoyISO = new Date(now.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10) // Bogotá
  const resultado = evaluarLote({ lote, reglas, tiposActivos, categoriaChain: chain, hoyISO, ahoraMs: now.getTime() })

  return NextResponse.json(resultado)
}
