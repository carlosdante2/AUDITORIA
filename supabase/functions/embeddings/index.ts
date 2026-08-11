// Supabase Edge Function: embeddings
// Generates OpenAI text-embedding-3-small for product names and stores them in products.embedding.
// Supports single product_id or batch up to 500.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_MODEL  = 'text-embedding-3-small'
const MAX_BATCH     = 500
const BATCH_CHUNK   = 50  // OpenAI embeddings per request

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'UNAUTHORIZED' }, 401)

  // Validate caller is authenticated
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const openaiKey      = Deno.env.get('OPENAI_API_KEY')!

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { authorization: authHeader, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
  })
  if (!userRes.ok) return json({ error: 'UNAUTHORIZED' }, 401)
  const { user } = await userRes.json()
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401)

  let body: { product_id?: string; product_ids?: string[] }
  try { body = await req.json() } catch { return json({ error: 'INVALID_JSON' }, 400) }

  const ids: string[] = body.product_ids
    ? body.product_ids.slice(0, MAX_BATCH)
    : body.product_id
      ? [body.product_id]
      : []

  if (ids.length === 0) return json({ error: 'NO_PRODUCT_IDS' }, 400)

  // Fetch product names from Supabase
  const productsRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=in.(${ids.join(',')})&select=id,nombre`,
    { headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` } }
  )
  const products: Array<{ id: string; nombre: string }> = await productsRes.json()

  if (!products.length) return json({ processed: 0, errors: ['No products found'] }, 200)

  let processed = 0
  const errors: string[] = []

  // Process in chunks to respect OpenAI rate limits
  for (let i = 0; i < products.length; i += BATCH_CHUNK) {
    const chunk = products.slice(i, i + BATCH_CHUNK)

    try {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: chunk.map((p) => p.nombre),
        }),
      })

      if (!embRes.ok) {
        const errBody = await embRes.text()
        errors.push(`OpenAI error chunk ${i}: ${errBody.slice(0, 100)}`)
        continue
      }

      const embData = await embRes.json()
      const embeddings: Array<{ index: number; embedding: number[] }> = embData.data

      // Update each product's embedding in Supabase
      for (const { index, embedding } of embeddings) {
        const { id } = chunk[index]
        const updateRes = await fetch(
          `${supabaseUrl}/rest/v1/products?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceRoleKey,
              authorization: `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ embedding: `[${embedding.join(',')}]` }),
          }
        )
        if (updateRes.ok) {
          processed++
        } else {
          errors.push(`Update failed for product ${id}`)
        }
      }
    } catch (err) {
      errors.push(`Chunk ${i} error: ${String(err).slice(0, 100)}`)
    }
  }

  const status = errors.length > 0 && processed === 0 ? 207 : 200
  return json({ processed, total: products.length, errors }, status)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
