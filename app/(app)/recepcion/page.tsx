import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Plus, ChevronRight, Clock, AlertTriangle } from 'lucide-react'

interface Reception {
  id: string
  proveedor: string | null
  estado: string
  created_at: string
  confirmed_at: string | null
}

const ESTADO_CONFIG: Record<string, { label: string; class: string }> = {
  borrador:        { label: 'Borrador',   class: 'bg-gray-100 text-gray-500' },
  confirmada:      { label: 'Confirmada', class: 'bg-green-100 text-green-700' },
  con_pendientes:  { label: 'Con pendientes', class: 'bg-yellow-100 text-yellow-700' },
}

export default async function RecepcionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: receptions } = await supabase
    .from('receptions')
    .select('id, proveedor, estado, created_at, confirmed_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (receptions ?? []) as Reception[]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recepciones</h1>
          <p className="text-sm text-gray-500">{rows.length} recepción{rows.length !== 1 ? 'es' : ''}</p>
        </div>
        <Link
          href="/recepcion/nueva"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </Link>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          No hay recepciones registradas.{' '}
          <Link href="/recepcion/nueva" className="text-blue-600 underline">
            Fotografiar primera factura
          </Link>
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => {
          const cfg = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.borrador
          const hasPending = r.estado === 'con_pendientes'

          return (
            <li key={r.id}>
              <Link
                href={`/recepcion/${r.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {r.proveedor ?? 'Proveedor desconocido'}
                    </p>
                    {hasPending && (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(r.created_at).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
