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
    (acc, s) => {
      acc.verde += s.verde; acc.amarillo += s.amarillo
      acc.naranja += s.naranja; acc.rojo += s.rojo; acc.gris += s.gris
      return acc
    },
    { verde: 0, amarillo: 0, naranja: 0, rojo: 0, gris: 0 }
  )
  const totalItems = kpi.verde + kpi.amarillo + kpi.naranja + kpi.rojo + kpi.gris

  // Críticas = rojo + naranja (urgente). warnAlerts = amarillo.
  const redAlerts  = alerts.filter((a) => a.semaforo_color === 'rojo' || a.semaforo_color === 'naranja')
  const warnAlerts = alerts.filter((a) => a.semaforo_color === 'amarillo')

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
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
          <div key={color} className={`rounded-2xl border p-5 text-center ${cls}`}>
            <p className="text-4xl font-black tabular-nums">{count}</p>
            <p className="text-sm font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Critical alerts */}
      {redAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-gray-800">
              Alertas críticas ({redAlerts.length})
            </h2>
          </div>
          <ul className="space-y-2.5">
            {redAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/sesiones/${alert.session_id}`}
                  className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4 hover:bg-red-100 active:scale-[0.99] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-red-900 truncate">{alert.product_name}</p>
                    <p className="text-sm text-red-600 mt-0.5 truncate">
                      {alert.cantidad} {alert.unidad_medida} · {alert.bodega}
                    </p>
                    <p className="text-xs text-red-500 mt-1 truncate">{alert.semaforo_razon}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(alert.created_at)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-red-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Warnings */}
      {warnAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-700">
            Alertas de seguimiento ({warnAlerts.length})
          </h2>
          <ul className="space-y-2">
            {warnAlerts.slice(0, 5).map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/sesiones/${alert.session_id}`}
                  className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3.5 hover:bg-yellow-100 active:scale-[0.99] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-base font-medium text-yellow-900 truncate">{alert.product_name}</p>
                    <p className="text-sm text-yellow-600 mt-0.5 truncate">
                      {alert.bodega} · {timeAgo(alert.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-yellow-500 shrink-0" />
                </Link>
              </li>
            ))}
            {warnAlerts.length > 5 && (
              <p className="text-sm text-gray-400 text-center pt-1">
                +{warnAlerts.length - 5} más
              </p>
            )}
          </ul>
        </section>
      )}

      {/* Active sessions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Sesiones activas</h2>
          <Link href="/sesiones" className="text-sm text-blue-600 font-medium hover:underline">Ver todas</Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No hay sesiones en curso.{' '}
            <Link href="/captura" className="text-blue-600 underline">Iniciar auditoría</Link>
          </p>
        ) : (
          <ul className="space-y-2.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sesiones/${s.id}`}
                  className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:border-blue-300 hover:bg-blue-50/20 active:scale-[0.99] transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900 truncate">{s.bodega}</p>
                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                      {(['rojo', 'amarillo', 'verde'] as const).map((color) => {
                        const count = s[color]
                        if (count === 0) return null
                        return (
                          <span key={color} className="flex items-center gap-1 text-sm text-gray-500">
                            <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[color]}`} />
                            {count}
                          </span>
                        )
                      })}
                      <span className="text-sm text-gray-400">· {s.total} ítems</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending products panel — supervisor / admin only */}
      {(rol === 'supervisor' || rol === 'admin') && pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-bold text-gray-800">
              Productos pendientes de aprobación ({pending.length})
            </h2>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl divide-y divide-purple-100 overflow-hidden">
            {pending.slice(0, 5).map((p) => (
              <PendingProductRow key={p.id} product={p} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} />
            ))}
            {pending.length > 5 && (
              <div className="px-4 py-3.5 text-center">
                <Link href="/admin/pendientes" className="text-sm text-purple-700 font-semibold hover:underline">
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
    <div className="px-4 py-3.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold text-purple-900 truncate">{product.nombre_sugerido}</p>
          <p className="text-sm text-purple-600">
            {product.unidad_sugerida}
            {product.subtipo_sugerido && ` · ${product.subtipo_sugerido}`}
            {' · '}
            <span className="capitalize">{product.origen}</span>
          </p>
        </div>
        <Link
          href="/admin/pendientes"
          className="shrink-0 text-sm px-3.5 h-9 flex items-center bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
        >
          Revisar
        </Link>
      </div>
      {product.match_candidates && product.match_candidates.length > 0 && (
        <p className="text-xs text-purple-500">
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
