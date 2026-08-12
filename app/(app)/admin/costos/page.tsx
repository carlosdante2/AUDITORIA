import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { FREE_TIER, ALERT_THRESHOLD } from '@/lib/costs'
import { AlertTriangle, Mic, Camera, Sparkles, Search, Boxes } from 'lucide-react'

interface Row {
  service: string
  model: string
  endpoint: string
  input_tokens: number
  output_tokens: number
  audio_seconds: number
  cost_usd: number
  created_at: string
}

// Colombia = UTC-5 sin horario de verano
const BOGOTA_OFFSET_MS = 5 * 3600 * 1000
function bogotaDateStr(iso: string): string {
  return new Date(new Date(iso).getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10)
}
function fmtUSD(n: number): string {
  if (n === 0) return '$0.00'
  if (n < 0.01) return '$' + n.toFixed(4)
  return '$' + n.toFixed(2)
}
function fmtNum(n: number): string {
  return n.toLocaleString('es-CO')
}

const ENDPOINT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  voz:        { label: 'Transcripción de voz', icon: <Mic className="w-4 h-4 text-blue-500" /> },
  vision:     { label: 'OCR de facturas',      icon: <Camera className="w-4 h-4 text-purple-500" /> },
  insights:   { label: 'Insights de auditoría',icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
  match:      { label: 'Búsqueda semántica',   icon: <Search className="w-4 h-4 text-green-500" /> },
  embeddings: { label: 'Indexado de catálogo', icon: <Boxes className="w-4 h-4 text-indigo-500" /> },
}

export default async function CostosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  // Inicio de mes en hora Bogotá, expresado en UTC
  const nowBogota = new Date(Date.now() - BOGOTA_OFFSET_MS)
  const y = nowBogota.getUTCFullYear()
  const m = nowBogota.getUTCMonth()
  const dayOfMonth = nowBogota.getUTCDate()
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const startOfMonthUtc = new Date(Date.UTC(y, m, 1) + BOGOTA_OFFSET_MS).toISOString()
  const todayStr = nowBogota.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('api_usage')
    .select('service, model, endpoint, input_tokens, output_tokens, audio_seconds, cost_usd, created_at')
    .gte('created_at', startOfMonthUtc)
    .order('created_at', { ascending: false })
    .limit(20000)

  const rows = (data ?? []) as Row[]

  // ── Agregaciones ──────────────────────────────────────────────
  let monthCost = 0
  let todayCost = 0
  const byService: Record<string, { calls: number; inTok: number; outTok: number; audioSec: number; cost: number }> = {
    groq: { calls: 0, inTok: 0, outTok: 0, audioSec: 0, cost: 0 },
    jina: { calls: 0, inTok: 0, outTok: 0, audioSec: 0, cost: 0 },
  }
  const byEndpoint: Record<string, { calls: number; cost: number }> = {}
  const byDay: Record<string, number> = {}

  for (const r of rows) {
    monthCost += r.cost_usd
    const day = bogotaDateStr(r.created_at)
    if (day === todayStr) todayCost += r.cost_usd
    byDay[day] = (byDay[day] ?? 0) + r.cost_usd

    const svc = byService[r.service] ?? (byService[r.service] = { calls: 0, inTok: 0, outTok: 0, audioSec: 0, cost: 0 })
    svc.calls += 1
    svc.inTok += r.input_tokens
    svc.outTok += r.output_tokens
    svc.audioSec += Number(r.audio_seconds)
    svc.cost += r.cost_usd

    const ep = byEndpoint[r.endpoint] ?? (byEndpoint[r.endpoint] = { calls: 0, cost: 0 })
    ep.calls += 1
    ep.cost += r.cost_usd
  }

  const projection = dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : 0

  const groqTokens = byService.groq.inTok + byService.groq.outTok
  const jinaTokens = byService.jina.inTok + byService.jina.outTok
  const groqPct = Math.min(groqTokens / FREE_TIER.groq.monthlyTokens, 1)
  const jinaPct = Math.min(jinaTokens / FREE_TIER.jina.monthlyTokens, 1)

  const dayList = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  const monthLabel = nowBogota.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const anyAlert = groqPct >= ALERT_THRESHOLD || jinaPct >= ALERT_THRESHOLD

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Control de costos IA</h1>
        <p className="text-sm text-gray-500 capitalize">Uso de {monthLabel}</p>
      </div>

      {anyAlert && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            Te estás acercando al límite gratuito de al menos un servicio. Al superarlo, el uso empieza a costar según los precios de referencia.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-gray-900 tabular-nums">{fmtUSD(todayCost)}</p>
          <p className="text-xs text-gray-500 mt-1">Hoy</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-600 tabular-nums">{fmtUSD(monthCost)}</p>
          <p className="text-xs text-gray-500 mt-1">Acumulado mes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-gray-700 tabular-nums">{fmtUSD(projection)}</p>
          <p className="text-xs text-gray-500 mt-1">Proyección</p>
        </div>
      </div>

      {/* Free tier progress */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Consumo del plan gratuito</h2>

        <FreeTierBar
          name="Groq" pct={groqPct} used={groqTokens} limit={FREE_TIER.groq.monthlyTokens}
          unit="tokens" label={FREE_TIER.groq.label} alert={groqPct >= ALERT_THRESHOLD}
        />
        <FreeTierBar
          name="Jina" pct={jinaPct} used={jinaTokens} limit={FREE_TIER.jina.monthlyTokens}
          unit="tokens" label={FREE_TIER.jina.label} alert={jinaPct >= ALERT_THRESHOLD}
        />
        <p className="text-xs text-gray-400">
          Los costos mostrados son estimación según precios de referencia (editables en <span className="font-mono">lib/costs.ts</span>). Mientras el uso esté dentro del plan gratuito, el cobro real es $0.
        </p>
      </section>

      {/* Per service */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Por servicio</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-gray-900">Groq</p>
            <p className="text-xs text-gray-500">{fmtNum(byService.groq.calls)} llamadas</p>
            <p className="text-xs text-gray-500">{fmtNum(groqTokens)} tokens</p>
            <p className="text-xs text-gray-500">{Math.round(byService.groq.audioSec / 60)} min audio</p>
            <p className="text-base font-black text-gray-900 tabular-nums pt-1">{fmtUSD(byService.groq.cost)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-gray-900">Jina</p>
            <p className="text-xs text-gray-500">{fmtNum(byService.jina.calls)} llamadas</p>
            <p className="text-xs text-gray-500">{fmtNum(jinaTokens)} tokens</p>
            <p className="text-xs text-gray-500">embeddings</p>
            <p className="text-base font-black text-gray-900 tabular-nums pt-1">{fmtUSD(byService.jina.cost)}</p>
          </div>
        </div>
      </section>

      {/* Per endpoint */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Por función</h2>
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
          {Object.entries(byEndpoint).sort((a, b) => b[1].cost - a[1].cost).map(([ep, v]) => {
            const meta = ENDPOINT_META[ep] ?? { label: ep, icon: null }
            return (
              <div key={ep} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {meta.icon}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{meta.label}</p>
                    <p className="text-xs text-gray-400">{fmtNum(v.calls)} llamadas</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 tabular-nums shrink-0">{fmtUSD(v.cost)}</p>
              </div>
            )
          })}
          {Object.keys(byEndpoint).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin uso registrado este mes.</p>
          )}
        </div>
      </section>

      {/* Daily */}
      {dayList.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700">Últimos días</h2>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {dayList.map(([day, cost]) => (
              <div key={day} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-gray-600 tabular-nums">
                  {new Date(day + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
                <p className="text-sm font-medium text-gray-900 tabular-nums">{fmtUSD(cost)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function FreeTierBar({ name, pct, used, limit, unit, label, alert }: {
  name: string; pct: number; used: number; limit: number; unit: string; label: string; alert: boolean
}) {
  const barColor = alert ? 'bg-red-500' : pct >= 0.5 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className={`text-xs font-bold ${alert ? 'text-red-600' : 'text-gray-500'}`}>{Math.round(pct * 100)}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.max(pct * 100, 1)}%` }} />
      </div>
      <p className="text-xs text-gray-400">
        {used.toLocaleString('es-CO')} / {limit.toLocaleString('es-CO')} {unit} · {label}
      </p>
    </div>
  )
}
