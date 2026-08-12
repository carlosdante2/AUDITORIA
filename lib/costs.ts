import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Precios de referencia (USD). VERIFICAR contra el pricing oficial — cambian.
//   Groq: https://groq.com/pricing      Jina: https://jina.ai/embeddings/
// Ajusta estos valores cuando cambie el pricing; el costo se calcula y guarda
// en cada llamada usando estas constantes.
// ============================================================================

type GroqAudioPrice = { audioPerHour: number }
type GroqTokenPrice = { inPerM: number; outPerM: number }
type JinaTokenPrice = { perM: number }

export const PRICING: {
  groq: Record<string, GroqAudioPrice | GroqTokenPrice>
  jina: Record<string, JinaTokenPrice>
} = {
  groq: {
    'whisper-large-v3-turbo':          { audioPerHour: 0.04 },          // $/hora de audio
    'llama-3.3-70b-versatile':         { inPerM: 0.59, outPerM: 0.79 }, // $/1M tokens
    'llama-4-scout-17b-16e-instruct':  { inPerM: 0.11, outPerM: 0.34 },
  },
  jina: {
    'jina-embeddings-v3':              { perM: 0.02 },                  // $/1M tokens (tras free)
  },
}

// Asignación gratuita por servicio — para barras de progreso y alertas.
// Jina regala ~1M tokens por API key. Groq opera con free tier con límites;
// aquí definimos un umbral mensual de referencia para avisar cuándo se acerca.
export const FREE_TIER = {
  jina: { monthlyTokens: 1_000_000, label: '1M tokens gratis' },
  groq: { monthlyTokens: 5_000_000, label: 'Free tier (referencia)' },
}

// Umbral de alerta: avisar cuando el uso supere este % del free tier.
export const ALERT_THRESHOLD = 0.8

export type Service = 'groq' | 'jina'
export type Endpoint = 'voz' | 'vision' | 'insights' | 'embeddings' | 'match'

export interface UsageInput {
  service: Service
  model: string
  inputTokens?: number
  outputTokens?: number
  audioSeconds?: number
}

// Costo estimado en USD de una sola llamada.
export function estimateCost(u: UsageInput): number {
  const inTok = u.inputTokens ?? 0
  const outTok = u.outputTokens ?? 0
  const secs = u.audioSeconds ?? 0

  if (u.service === 'groq') {
    const p = PRICING.groq[u.model]
    if (!p) return 0
    if ('audioPerHour' in p) return (secs / 3600) * p.audioPerHour
    return (inTok / 1e6) * p.inPerM + (outTok / 1e6) * p.outPerM
  }
  if (u.service === 'jina') {
    const p = PRICING.jina[u.model]
    return p ? (inTok / 1e6) * p.perM : 0
  }
  return 0
}

// Registra una llamada. Best-effort: nunca lanza ni bloquea la respuesta.
export async function logApiUsage(
  supabase: SupabaseClient,
  params: UsageInput & { tenantId: string; endpoint: Endpoint }
): Promise<void> {
  try {
    const cost = estimateCost(params)
    await supabase.from('api_usage').insert({
      tenant_id:     params.tenantId,
      service:       params.service,
      model:         params.model,
      endpoint:      params.endpoint,
      input_tokens:  Math.round(params.inputTokens ?? 0),
      output_tokens: Math.round(params.outputTokens ?? 0),
      audio_seconds: params.audioSeconds ?? 0,
      cost_usd:      cost,
    })
  } catch {
    // registro de costos no debe afectar el flujo principal
  }
}
