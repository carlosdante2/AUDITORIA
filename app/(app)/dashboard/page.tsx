import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getActiveSessions, getAlertSummary, getPendingProducts } from '@/lib/queries'
import Link from 'next/link'
import { ChevronRight, Clock, AlertTriangle, Package } from 'lucide-react'

const COLOR_DOT: Record<string, string> = {
  verde:    'bg-green-500',
  amarillo: 'bg-yellow-400',
  rojo:     'bg-red-500',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined

  const [sessions, alerts, pending] = await Promise.all([
    getActiveSessions(supabase),
    getAlertSummary(supabase, 20),
    getPendingProducts(supabase),
  ])

  // Aggregate KPIs across all active sessions
  const kpi = sessions.reduce(
    (acc, s) => { acc.verde += s.verde; acc.amarillo += s.amarillo; acc.rojo += s.rojo; return acc },
    { verde: 0, amarillo: 0, rojo: 0 }
  )
  const totalItems = kpi.verde + kpi.amarillo + kpi.rojo

  const redAlerts  = alerts.filter((a) => a.semaforo_color === 'rojo')
  const warnAlerts = alerts.filter((a) => a.semaforo_color === 'amarillo')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} activa{sessions.length !== 1 ? 's' : ''} · {totalItems} ítems auditados
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['rojo',    kpi.rojo,    'Riesgo',  'bg-red-50 border-red-200 text-red-700'],
          ['amarillo',kpi.amarillo,'Alerta',  'bg-yellow-50 border-yellow-200 text-yellow-700'],
          ['verde',   kpi.verde,   'Aptos',   'bg-green-50 border-green-200 text-green-700'],
        ] as const).map(([color, count, label, cls]) => (
          <div key={color} className={`rounded-2xl border p-4 text-center ${cls}`}>
            <p className="text-3xl font-black">{count}</p>
            <p className="text-xs font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Critical alerts */}
      {redAlerts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-gray-800">
              Alertas críticas ({redAlerts.length})
            </h2>
          </div>
          <ul className="space-y-2">
            {redAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/sesiones/${alert.session_id}`}
                  className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-900 truncate">{alert.product_name}</p>
                    <p className="text-xs text-red-600 mt-0.5 truncate">
                      {alert.cantidad} {alert.unidad_medida} · {alert.bodega}
                    </p>
                    <p className="text-xs text-red-500 mt-0.5 truncate">{alert.semaforo_razon}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-[10px] text-red-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.created_at)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Warnings */}
      {warnAlerts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">
            Alertas de seguimiento ({warnAlerts.length})
          </h2>
          <ul className="space-y-1.5">
            {warnAlerts.slice(0, 5).map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/sesiones/${alert.session_id}`}
                  className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 hover:bg-yellow-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-yellow-900 truncate">{alert.product_name}</p>
                    <p className="text-xs text-yellow-600 mt-0.5 truncate">
                      {alert.bodega} · {timeAgo(alert.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-yellow-500 ml-3 shrink-0" />
                </Link>
              </li>
            ))}
            {warnAlerts.length > 5 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{warnAlerts.length - 5} más
              </p>
            )}
          </ul>
        </section>
      )}

      {/* Active sessions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Sesiones activas</h2>
          <Link href="/sesiones" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No hay sesiones en curso.{' '}
            <Link href="/captura" className="text-blue-600 underline">Iniciar auditoría</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sesiones/${s.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.bodega}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(['rojo', 'amarillo', 'verde'] as const).map((color) => {
                        const count = s[color]
                        if (count === 0) return null
                        return (
                          <span key={color} className="flex items-center gap-1 text-xs text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${COLOR_DOT[color]}`} />
                            {count}
                          </span>
                        )
                      })}
                      <span className="text-xs text-gray-400">· {s.total} ítems</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending products panel — supervisor / admin only */}
      {(rol === 'supervisor' || rol === 'admin') && pending.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold text-gray-800">
              Productos pendientes de aprobación ({pending.length})
            </h2>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl divide-y divide-purple-100 overflow-hidden">
            {pending.slice(0, 5).map((p) => (
              <PendingProductRow key={p.id} product={p} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />
            ))}
            {pending.length > 5 && (
              <div className="px-4 py-3 text-center">
                <Link href="/admin/pendientes" className="text-xs text-purple-700 font-semibold hover:underline">
                  Ver los {pending.length - 5} restantes →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function PendingProductRow({ product }: { product: import('@/lib/queries').PendingProduct; supabaseUrl: string }) {
  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-purple-900 truncate">{product.nombre_sugerido}</p>
          <p className="text-xs text-purple-600">
            {product.unidad_sugerida}
            {product.subtipo_sugerido && ` · ${product.subtipo_sugerido}`}
            {' · '}
            <span className="capitalize">{product.origen}</span>
          </p>
        </div>
        <Link
          href="/admin/pendientes"
          className="shrink-0 text-xs px-2.5 py-1 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
        >
          Revisar
        </Link>
      </div>
      {product.match_candidates && product.match_candidates.length > 0 && (
        <p className="text-[10px] text-purple-500">
          Candidato: {product.match_candidates[0].nombre} ({(product.match_candidates[0].score * 100).toFixed(0)}%)
        </p>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}
