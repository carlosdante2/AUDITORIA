import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'

type SemaforoColor = 'verde' | 'amarillo' | 'rojo'

interface ColorCounts {
  verde: number
  amarillo: number
  rojo: number
}

interface Session {
  id: string
  bodega: string
  estado: string
  opened_at: string
  closed_at: string | null
  color_counts: ColorCounts
}

const COLOR_BADGE: Record<SemaforoColor, string> = {
  verde: 'bg-green-100 text-green-700',
  amarillo: 'bg-yellow-100 text-yellow-700',
  rojo: 'bg-red-100 text-red-700',
}

const COLOR_DOT: Record<SemaforoColor, string> = {
  verde: 'bg-green-500',
  amarillo: 'bg-yellow-400',
  rojo: 'bg-red-500',
}

export default async function SesionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('audit_sessions')
    .select('id, bodega, estado, opened_at, closed_at')
    .order('opened_at', { ascending: false })
    .limit(50)

  // Fetch color counts per session in one query
  const sessionIds = (sessions ?? []).map((s) => s.id)
  let colorCountsBySession: Record<string, ColorCounts> = {}

  if (sessionIds.length > 0) {
    const { data: counts } = await supabase
      .from('product_counts')
      .select('session_id, semaforo_color')
      .in('session_id', sessionIds)

    for (const row of counts ?? []) {
      const { session_id, semaforo_color } = row as { session_id: string; semaforo_color: SemaforoColor }
      if (!colorCountsBySession[session_id]) {
        colorCountsBySession[session_id] = { verde: 0, amarillo: 0, rojo: 0 }
      }
      if (semaforo_color in colorCountsBySession[session_id]) {
        colorCountsBySession[session_id][semaforo_color]++
      }
    }
  }

  const enriched: Session[] = (sessions ?? []).map((s) => ({
    ...s,
    color_counts: colorCountsBySession[s.id] ?? { verde: 0, amarillo: 0, rojo: 0 },
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sesiones de auditoría</h1>
        <p className="text-sm text-gray-500 mt-0.5">{enriched.length} sesión{enriched.length !== 1 ? 'es' : ''}</p>
      </div>

      {enriched.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          No hay sesiones registradas todavía.{' '}
          <Link href="/captura" className="text-blue-600 underline underline-offset-2">
            Iniciar primera sesión
          </Link>
        </p>
      )}

      <ul className="space-y-2.5">
        {enriched.map((session) => {
          const total = session.color_counts.verde + session.color_counts.amarillo + session.color_counts.rojo
          const hasAlerts = session.color_counts.rojo > 0

          return (
            <li key={session.id}>
              <Link
                href={`/sesiones/${session.id}`}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/20 active:scale-[0.99] transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900 truncate">{session.bodega}</p>
                    {hasAlerts && (
                      <span className="shrink-0 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                        {session.color_counts.rojo} rojo{session.color_counts.rojo > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(session.opened_at).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                    {session.closed_at && ' → ' + new Date(session.closed_at).toLocaleTimeString('es-CO', { timeStyle: 'short' })}
                  </p>

                  {total > 0 && (
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      {(['verde', 'amarillo', 'rojo'] as SemaforoColor[]).map((color) => {
                        const count = session.color_counts[color]
                        if (count === 0) return null
                        return (
                          <span key={color} className={`inline-flex items-center gap-1 text-sm px-2.5 py-0.5 rounded-full font-medium ${COLOR_BADGE[color]}`}>
                            <span className={`w-2 h-2 rounded-full ${COLOR_DOT[color]}`} />
                            {count}
                          </span>
                        )
                      })}
                      <span className="text-sm text-gray-400">de {total}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    session.estado === 'abierta'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {session.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
