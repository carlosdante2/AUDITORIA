import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { query, top_k = 3 } = body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'MISSING_QUERY' }, { status: 400 })
  }

  try {
    const jinaRes = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: [query.trim()],
      }),
    })

    if (!jinaRes.ok) {
      const err = await jinaRes.text()
      console.error('[api/match] Jina error:', err)
      return NextResponse.json({ error: 'EMBEDDING_ERROR' }, { status: 500 })
    }

    const jinaData = await jinaRes.json()
    const embedding: number[] = jinaData.data[0].embedding

    // match_products is scoped to caller's tenant via get_my_tenant_id() in the function
    const { data: matches, error: matchError } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_threshold: 0.70,
      match_count: Math.min(top_k, 5),
    })

    if (matchError) {
      console.error('[api/match] pgvector error:', matchError)
      return NextResponse.json({ error: 'MATCH_ERROR', message: matchError.message }, { status: 500 })
    }

    const results = (matches ?? []) as Array<{
      id: string; nombre: string; unidad_medida: string; subtipo: string
      requiere_fecha_vencimiento: boolean; similarity: number
    }>

    const belowThreshold = results.length === 0 || results[0].similarity < 0.75

    return NextResponse.json({
      matches: results.map((m) => ({
        producto_id: m.id,
        nombre: m.nombre,
        unidad_medida: m.unidad_medida,
        subtipo: m.subtipo,
        score: m.similarity,
        requiere_fecha_vencimiento: m.requiere_fecha_vencimiento,
      })),
      below_threshold: belowThreshold,
      ...(belowThreshold && {
        suggestion: 'Ningún producto en catálogo coincide con suficiente confianza. Se creará como producto pendiente.',
      }),
    })
  } catch (err) {
    console.error('[api/match] error:', err)
    return NextResponse.json({ error: 'MATCH_ERROR' }, { status: 500 })
  }
}
