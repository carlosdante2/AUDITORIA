import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Groq from 'groq-sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  const receptionId = formData.get('reception_id') as string | null

  if (!image || !receptionId) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${image.type};base64,${base64}`

    const response = await groq.chat.completions.create({
      model: 'llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            {
              type: 'text',
              text: `Eres un asistente especializado en facturas de proveedores de alimentos y bebidas en Colombia.
Extrae todos los productos de esta factura. Devuelve SOLO un JSON con este formato exacto:
{
  "proveedor": "nombre del proveedor o null",
  "fecha_factura": "YYYY-MM-DD o null",
  "items": [
    { "descripcion": "nombre del producto", "cantidad": número_o_null, "unidad": "kg/litros/unidades/cajas/etc", "precio_unitario": número_o_null }
  ]
}
Si no puedes leer un campo, usa null. No incluyas texto fuera del JSON.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const rawText = response.choices[0]?.message?.content || ''

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(jsonMatch?.[0] || rawText)
      return NextResponse.json({
        reception_id: receptionId,
        proveedor: parsed.proveedor ?? null,
        fecha_factura: parsed.fecha_factura ?? null,
        items: parsed.items ?? [],
        confidence: 0.85,
        raw_text: rawText,
      })
    } catch {
      return NextResponse.json(
        { error: 'IMAGE_NOT_READABLE', message: 'No se pudo leer el texto de la imagen. Tome una foto más nítida.' },
        { status: 422 }
      )
    }
  } catch (err) {
    console.error('[api/vision] Groq error:', err)
    return NextResponse.json({ error: 'VISION_UNAVAILABLE', message: 'Servicio de visión no disponible.' }, { status: 502 })
  }
}
