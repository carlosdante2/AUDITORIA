import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

// Claude haiku insights — ONLINE ONLY, OPTIONAL
// Never blocks the audit flow — if unavailable, callers ignore gracefully

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await request.json()
  const { session_id, counts_summary, bodega, sector } = body

  if (!session_id || !Array.isArray(counts_summary) || counts_summary.length === 0) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Limit to 20 most critical items to stay within context budget
    const criticalItems = counts_summary
      .filter((c: { semaforo_color: string }) => c.semaforo_color !== 'verde')
      .slice(0, 20)

    const criticalCount = counts_summary.filter((c: { semaforo_color: string }) => c.semaforo_color === 'rojo').length
    const warningCount  = counts_summary.filter((c: { semaforo_color: string }) => c.semaforo_color === 'amarillo').length
    const okCount       = counts_summary.filter((c: { semaforo_color: string }) => c.semaforo_color === 'verde').length

    if (criticalItems.length === 0) {
      return NextResponse.json({
        insights: `Sesión en "${bodega}" sin alertas. Los ${okCount} productos revisados están en estado óptimo.`,
        critical_count: 0,
        warning_count: warningCount,
        ok_count: okCount,
      })
    }

    const prompt = `Eres un experto en inocuidad alimentaria (INVIMA Colombia).
Genera un resumen ejecutivo BREVE (máximo 3 oraciones) de esta sesión de auditoría en la bodega "${bodega}".
Enfócate en acciones inmediatas. Responde en español, tono profesional.

Hallazgos (${criticalItems.length} con alertas):
${criticalItems
  .map((c: { nombre: string; cantidad: number; unidad_medida: string; semaforo_color: string; semaforo_razon: string; semaforo_accion: string })  =>
    `- ${c.nombre} (${c.cantidad} ${c.unidad_medida}): ${c.semaforo_color.toUpperCase()} — ${c.semaforo_razon}. Acción: ${c.semaforo_accion}`
  )
  .join('\n')}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const insights = (message.content[0] as { type: string; text: string }).text

    return NextResponse.json({ insights, critical_count: criticalCount, warning_count: warningCount, ok_count: okCount })
  } catch (err) {
    console.error('[api/semaforo-ia] Claude error:', err)
    return NextResponse.json(
      { error: 'AI_UNAVAILABLE', message: 'Insights de IA no disponibles sin conexión. El semáforo local sigue activo.' },
      { status: 503 }
    )
  }
}
