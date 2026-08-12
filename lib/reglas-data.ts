import type { SupabaseClient } from '@supabase/supabase-js'
import type { Regla, TipoRegla, Umbral } from './reglas-engine'

// Inserta los umbrales de una regla (respeta el orden dado).
export async function insertarUmbrales(supabase: SupabaseClient, reglaId: string, umbrales: Umbral[]) {
  const rows = umbrales.map((u, i) => ({
    regla_id: reglaId, color: u.color, operador: u.operador,
    valor_min: u.valor_min, valor_max: u.valor_max, valor_text: u.valor_text,
    unidad: u.unidad, accion: u.accion ?? 'SOLO_ALERTA', mensaje: u.mensaje, orden: u.orden ?? i,
  }))
  await supabase.from('regla_umbrales').insert(rows)
}

// Carga las reglas vigentes (vigente_hasta null && activa) con sus umbrales.
// tenantId es opcional: bajo RLS el scoping es automático; con service-role
// (cron) hay que filtrar explícitamente por tenant.
export async function cargarReglasActivas(
  supabase: SupabaseClient, tenantId?: string
): Promise<{ reglas: Regla[]; tiposActivos: TipoRegla[] }> {
  let q = supabase
    .from('reglas')
    .select('id, tipo, ambito, ambito_id, version, regla_umbrales(color, operador, valor_min, valor_max, valor_text, unidad, accion, mensaje, orden)')
    .is('vigente_hasta', null)
    .eq('activa', true)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data } = await q

  const reglas: Regla[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    tipo: r.tipo as TipoRegla,
    ambito: r.ambito as Regla['ambito'],
    ambito_id: (r.ambito_id as string | null) ?? null,
    version: r.version as number,
    umbrales: ((r.regla_umbrales as Umbral[]) ?? []).slice().sort((a, b) => a.orden - b.orden),
  }))

  const tiposActivos = [...new Set(reglas.map((r) => r.tipo))]
  return { reglas, tiposActivos }
}

// Cadena de categorías desde la específica hasta la raíz (por parent_id).
export async function categoriaChain(
  supabase: SupabaseClient, categoriaId: string | null
): Promise<string[]> {
  const chain: string[] = []
  const visto = new Set<string>()
  let cur = categoriaId
  while (cur && !visto.has(cur)) {
    visto.add(cur)
    chain.push(cur)
    const { data } = await supabase.from('categorias').select('parent_id').eq('id', cur).single()
    cur = (data?.parent_id as string | null) ?? null
  }
  return chain
}
