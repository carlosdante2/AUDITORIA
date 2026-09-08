import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { logApiUsage } from '@/lib/costs'
import Groq from 'groq-sdk'

// POST /api/vision/fecha → lee la fecha de vencimiento impresa en el empaque
// a partir de la foto de evidencia que el auditor ya tomó (Captura).
// ONLINE ONLY, OPTIONAL — nunca bloquea el conteo: si falla o no detecta nada,
// el auditor sigue pudiendo escribir la fecha a mano.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const image = formData.get('image') as File | null

  if (!image) {
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
              text: `Eres un asistente que lee fechas de vencimiento impresas en empaques de alimentos.
Busca en la imagen una fecha de vencimiento, caducidad, consumo preferente o marcada como "VENCE"/"VTO"/"EXP"/"CAD".
Devuelve SOLO un JSON con este formato exacto:
{
  "fecha_vencimiento": "YYYY-MM-DD" o null si no encuentras una fecha legible,
  "texto_encontrado": "el texto exacto que leíste en el empaque, o null"
}
Si el año viene abreviado (ej. "26"), asume 20 + esos dos dígitos. Si el mes viene en letras o abreviado (ej. "MAR"), conviértelo a número.
No inventes una fecha si no la ves con claridad — en ese caso responde null. No incluyas texto fuera del JSON.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    })

    const rawText = response.choices[0]?.message?.content || ''

    await logApiUsage(supabase, {
      tenantId: user.app_metadata?.tenant_id as string,
      service: 'groq',
      model: 'llama-4-scout-17b-16e-instruct',
      endpoint: 'vision-fecha',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    })

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(jsonMatch?.[0] || rawText)
      const fecha = typeof parsed.fecha_vencimiento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha_vencimiento)
        ? parsed.fecha_vencimiento
        : null
      return NextResponse.json({
        fecha_vencimiento: fecha,
        texto_encontrado: parsed.texto_encontrado ?? null,
      })
    } catch {
      return NextResponse.json({ fecha_vencimiento: null, texto_encontrado: null })
    }
  } catch (err) {
    console.error('[api/vision/fecha] Groq error:', err)
    return NextResponse.json(
      { error: 'VISION_UNAVAILABLE', message: 'No se pudo leer la foto. Ingresa la fecha manualmente.' },
      { status: 502 }
    )
  }
}
