import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluarLote, type LoteEval, type ResultadoLote } from './reglas-engine'
import { cargarReglasActivas, categoriaChain } from './reglas-data'

function hoyBogota(now: Date): string {
  return new Date(now.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10)
}

// Evalúa un lote con las reglas vigentes y materializa lote_estado + alertas.
export async function evaluarYMaterializar(
  supabase: SupabaseClient, loteId: string, tenantId: string
): Promise<ResultadoLote | null> {
  const { data: lote } = await supabase
    .from('lotes')
    .select('id, producto_id, equipo_id, codigo_lote, proveedor_id, fecha_vencimiento, fecha_apertura, estado_cuarentena, cantidad')
    .eq('id', loteId).single()
  if (!lote) return null

  const { data: prod } = await supabase.from('products').select('categoria_id, requiere_fecha_vencimiento').eq('id', lote.producto_id).single()
  const categoria_id = (prod?.categoria_id as string | null) ?? null
  const requiere_fecha_vencimiento = (prod?.requiere_fecha_vencimiento as boolean | null) ?? true

  // Cadena de frío: última lectura del equipo donde está el lote
  let temperatura_c: number | null = null
  let ultima_lectura_ms: number | null = null
  if (lote.equipo_id) {
    const { data: lect } = await supabase
      .from('lecturas_temperatura')
      .select('valor_c, registrado_en')
      .eq('equipo_id', lote.equipo_id)
      .order('registrado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lect) {
      temperatura_c = Number(lect.valor_c)
      ultima_lectura_ms = new Date(lect.registrado_en).getTime()
    }
  }

  const [{ reglas, tiposActivos }, chain] = await Promise.all([
    cargarReglasActivas(supabase, tenantId), // filtra por tenant (necesario bajo service-role/cron)
    categoriaChain(supabase, categoria_id),
  ])

  const now = new Date()
  const loteEval: LoteEval = {
    producto_id: lote.producto_id,
    categoria_id,
    codigo_lote: lote.codigo_lote,
    proveedor_id: lote.proveedor_id,
    fecha_vencimiento: lote.fecha_vencimiento,
    fecha_apertura: lote.fecha_apertura,
    estado_cuarentena: lote.estado_cuarentena,
    cantidad: Number(lote.cantidad),
    requiere_fecha_vencimiento,
    temperatura_c,
    ultima_lectura_ms,
  }
  const res = evaluarLote({ lote: loteEval, reglas, tiposActivos, categoriaChain: chain, hoyISO: hoyBogota(now), ahoraMs: now.getTime() })

  // Materializa estado
  await supabase.from('lote_estado').upsert({
    lote_id: loteId, tenant_id: tenantId, color: res.color_final,
    evaluado_en: now.toISOString(), detalle: res.detalle,
    bloqueo_salida: res.bloqueo_salida, bloqueo_ingreso: res.bloqueo_ingreso,
  })

  // Alertas: una por (lote, regla, color) sin duplicar las ya ABIERTAS. Versión congelada.
  const { data: abiertas } = await supabase
    .from('alertas').select('regla_id, color').eq('lote_id', loteId).eq('estado', 'ABIERTA')
  const yaAbierta = new Set((abiertas ?? []).map((a) => `${a.regla_id}|${a.color}`))

  const nuevas = res.detalle
    .filter((d) => d.regla_id && d.umbral_snapshot && ['AMARILLO', 'NARANJA', 'ROJO'].includes(d.color) && !yaAbierta.has(`${d.regla_id}|${d.color}`))
    .map((d) => ({
      tenant_id: tenantId, lote_id: loteId, regla_id: d.regla_id, regla_version: d.regla_version,
      umbral_snapshot: d.umbral_snapshot, color: d.color, valor_evaluado: d.valor_evaluado,
      mensaje: d.mensaje ?? `${d.tipo}: ${d.color}`, estado: 'ABIERTA',
    }))
  if (nuevas.length > 0) await supabase.from('alertas').insert(nuevas)

  return res
}

// Re-evalúa todos los lotes activos del tenant (al guardar/cambiar una regla).
export async function reevaluarTenant(supabase: SupabaseClient, tenantId: string, limite = 2000): Promise<number> {
  const { data: lotes } = await supabase
    .from('lotes').select('id').eq('tenant_id', tenantId).eq('activo', true).limit(limite)
  let n = 0
  for (const l of lotes ?? []) {
    await evaluarYMaterializar(supabase, l.id as string, tenantId)
    n++
  }
  return n
}

// Re-evalúa los lotes de un equipo (al registrar una lectura de temperatura).
export async function reevaluarEquipo(supabase: SupabaseClient, equipoId: string, tenantId: string): Promise<number> {
  const { data: lotes } = await supabase
    .from('lotes').select('id').eq('equipo_id', equipoId).eq('activo', true)
  let n = 0
  for (const l of lotes ?? []) {
    await evaluarYMaterializar(supabase, l.id as string, tenantId)
    n++
  }
  return n
}
