import { db } from '@/lib/db'

export interface MatchCandidate {
  productId: string
  nombre: string
  unidad_medida: string
  subtipo: string
  requiere_fecha_vencimiento: boolean
  score: number
  method: 'embedding' | 'text'
}

const DEFAULT_THRESHOLD = 0.70
const TOP_K = 3

// Dot product of two equal-length arrays. OpenAI embeddings are unit vectors
// so dot product == cosine similarity.
function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

// Vector similarity matching against Dexie product cache.
// Called when a query embedding is available (voice API returned transcription + embedding).
export async function matchByEmbedding(
  queryEmbedding: number[],
  tenantId: string,
  threshold = DEFAULT_THRESHOLD,
): Promise<MatchCandidate[]> {
  const products = await db.products
    .where('tenant_id')
    .equals(tenantId)
    .toArray()

  const scored = products
    .filter((p) => p.embedding != null && p.embedding.length === queryEmbedding.length)
    .map((p) => ({
      productId: p.id,
      nombre: p.nombre,
      unidad_medida: p.unidad_medida,
      subtipo: p.subtipo,
      requiere_fecha_vencimiento: p.requiere_fecha_vencimiento,
      score: dot(queryEmbedding, p.embedding as number[]),
      method: 'embedding' as const,
    }))
    .filter((p) => p.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)

  return scored
}

// Text-based fallback matching for when no embedding is available (fully offline).
// Splits query into tokens and counts how many appear in each product name.
export async function matchByText(
  query: string,
  tenantId: string,
): Promise<MatchCandidate[]> {
  const products = await db.products
    .where('tenant_id')
    .equals(tenantId)
    .toArray()

  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const scored = products
    .map((p) => {
      const name = normalize(p.nombre)
      const hits = tokens.filter((t) => name.includes(t)).length
      const score = hits / tokens.length
      return {
        productId: p.id,
        nombre: p.nombre,
        unidad_medida: p.unidad_medida,
        subtipo: p.subtipo,
        requiere_fecha_vencimiento: p.requiere_fecha_vencimiento,
        score,
        method: 'text' as const,
      }
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)

  return scored
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
