import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const BATCH_SIZE = 50

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  let q = supabase.from('products').select('id, nombre').eq('estado', 'activo')
  if (!force) q = q.is('embedding', null)
  const { data: products, error: fetchErr } = await q

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!products || products.length === 0) {
    return NextResponse.json({ generated: 0, errors: 0 })
  }

  let generated = 0
  let errors = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)

    try {
      const jinaRes = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'jina-embeddings-v3',
          input: batch.map((p) => p.nombre),
        }),
      })

      if (!jinaRes.ok) throw new Error(`Jina ${jinaRes.status}`)

      const jinaData = await jinaRes.json()
      const embeddings: number[][] = jinaData.data.map(
        (d: { embedding: number[] }) => d.embedding
      )

      for (let j = 0; j < batch.length; j++) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id)

        if (updateErr) {
          console.error('[api/embeddings] update error:', updateErr.message)
          errors++
        } else {
          generated++
        }
      }
    } catch (err) {
      console.error('[api/embeddings] batch error:', err)
      errors += batch.length
    }
  }

  return NextResponse.json({ generated, errors })
}
