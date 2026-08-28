import { db } from './db'
import { evaluarLote, type LoteEval, type ResultadoLote } from './reglas-engine'

// Evaluación del semáforo en el cliente, sin red, con el MISMO motor que el
// servidor (spec §5.2.5). Lee las reglas cacheadas; el resultado es provisional
// y el servidor lo re-evalúa de forma autoritativa al sincronizar.

function hoyBogota(now: Date): string {
  return new Date(now.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10)
}

// Cadena de categorías (hijo → raíz) desde el árbol cacheado.
function buildCategoriaChain(
  categoriaId: string | null,
  categorias: { id: string; parent_id: string | null }[],
): string[] {
  const parentOf = new Map(categorias.map((c) => [c.id, c.parent_id]))
  const chain: string[] = []
  const visto = new Set<string>()
  let cur = categoriaId
  while (cur && !visto.has(cur)) {
    visto.add(cur)
    chain.push(cur)
    cur = parentOf.get(cur) ?? null
  }
  return chain
}

const GRIS_SIN_CACHE: ResultadoLote = {
  color_final: 'GRIS',
  bloqueo_salida: false,
  bloqueo_ingreso: false,
  detalle: [],
}

// Evalúa un lote contra las reglas cacheadas del tenant.
// Sin caché de reglas → GRIS (se evaluará al sincronizar). Nunca VERDE.
// TEMPERATURA / LECTURA_VENCIDA quedan en GRIS offline (no hay lecturas en el
// dispositivo); el servidor las resuelve al re-evaluar.
export async function evaluarLoteOffline(tenantId: string, lote: LoteEval): Promise<ResultadoLote> {
  const cache = await db.reglasCache.get(tenantId)
  if (!cache || cache.reglas.length === 0) return GRIS_SIN_CACHE

  const chain = buildCategoriaChain(lote.categoria_id, cache.categorias)
  const now = new Date()
  return evaluarLote({
    lote,
    reglas: cache.reglas,
    tiposActivos: cache.tiposActivos,
    categoriaChain: chain,
    hoyISO: hoyBogota(now),
    ahoraMs: now.getTime(),
  })
}

export { buildCategoriaChain }
