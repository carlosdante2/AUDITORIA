import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getSessionCounts, getSignedUrl } from '@/lib/queries'
import { SemaforoChip } from '@/components/SemaforoChip'
import { CloseSessionButton } from './CloseSessionButton'
import type { SemaforoOutput } from '@/lib/semaforo'
import Link from 'next/link'
import { ArrowLeft, Mic, ExternalLink } from 'lucide-react'

interface ProductCount {
  id: string
  local_id: string
  cantidad: number
  unidad_medida: string
  fecha_vencimiento: string | null
  estado_empaque: string
  observacion_visual: string
  semaforo_color: 'verde' | 'amarillo' | 'rojo'
  semaforo_razon: string
  semaforo_accion: string
  semaforo_estrategia_circular: string | null
  semaforo_ods: string[]
  semaforo_metodo_calculo: 'fecha_documentada' | 'estimado_por_recepcion' | 'no_aplica'
  dias_restantes: number | null
  transcripcion_voz: string | null
  captura_metodo: 'voz' | 'manual'
  foto_evidencia_url: string | null
  created_at: string
  products: { nombre: string; subtipo: string } | null
}

function toSemaforoOutput(count: ProductCount): SemaforoOutput {
  return {
    categoria_asignada: 'perecedero_intermedio',
    dias_restantes: count.dias_restantes,
    metodo_calculo: count.semaforo_metodo_calculo,
    color: count.semaforo_color,
    razon: count.semaforo_razon,
    accion_sugerida: count.semaforo_accion,
    estrategia_economia_circular: count.semaforo_estrategia_circular,
    ods_relacionados: count.semaforo_ods,
  }
}

const COLOR_SORT: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 }

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  const isSupervisorOrAdmin = rol === 'supervisor' || rol === 'admin'

  const { data: session } = await supabase
    .from('audit_sessions')
    .select('id, bodega, estado, opened_at, closed_at, insights_ia')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const rawCounts = await getSessionCounts(supabase, id)
  const unsorted = rawCounts as unknown as ProductCount[]

  // Generate signed URLs for evidence photos (1h expiry) — evidence-photos is private
  const countsWithUrls = await Promise.all(
    unsorted.map(async (c) => {
      if (!c.foto_evidencia_url) return c
      const signedUrl = await getSignedUrl(supabase, 'evidence-photos', c.foto_evidencia_url)
      return { ...c, foto_evidencia_url: signedUrl }
    })
  )

  const counts = countsWithUrls.sort(
    (a, b) => (COLOR_SORT[a.semaforo_color] ?? 3) - (COLOR_SORT[b.semaforo_color] ?? 3)
  )

  const colorSummary = counts.reduce(
    (acc, c) => { acc[c.semaforo_color]++; return acc },
    { verde: 0, amarillo: 0, rojo: 0 } as Record<string, number>
  )

  // Prepare counts_summary for CloseSessionButton (Claude haiku input)
  const countsSummary = counts.map((c) => ({
    nombre: c.products?.nombre ?? 'Desconocido',
    cantidad: c.cantidad,
    unidad_medida: c.unidad_medida,
    semaforo_color: c.semaforo_color,
    semaforo_razon: c.semaforo_razon,
    semaforo_accion: c.semaforo_accion,
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/sesiones"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a sesiones
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.bodega}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(session.opened_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
              {' · '}
              <span className={session.estado === 'abierta' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {session.estado === 'abierta' ? 'En curso' : 'Cerrada'}
              </span>
            </p>
          </div>
          {/* Supervisor: close session button */}
          {isSupervisorOrAdmin && session.estado === 'abierta' && counts.length > 0 && (
            <CloseSessionButton
              sessionId={id}
              bodega={session.bodega}
              counts={countsSummary}
            />
          )}
        </div>
      </div>

      {/* Color summary */}
      {counts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {([
            ['rojo', 'Riesgo', 'bg-red-50 border-red-200 text-red-700'],
            ['amarillo', 'Alerta', 'bg-yellow-50 border-yellow-200 text-yellow-700'],
            ['verde', 'Aptos', 'bg-green-50 border-green-200 text-green-700'],
          ] as const).map(([color, label, cls]) => (
            <div key={color} className={`rounded-xl border p-3 text-center ${cls}`}>
              <p className="text-2xl font-black">{colorSummary[color] ?? 0}</p>
              <p className="text-xs font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI insights */}
      {session.insights_ia && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-purple-500 uppercase tracking-widest">Resumen IA</p>
          <p className="text-sm text-purple-900 leading-relaxed">{session.insights_ia}</p>
        </div>
      )}

      {/* Counts list */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {counts.length} ítem{counts.length !== 1 ? 's' : ''} registrado{counts.length !== 1 ? 's' : ''}
        </p>

        {counts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Esta sesión no tiene conteos registrados aún.
          </p>
        )}

        {counts.map((count) => (
          <div key={count.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {/* Product header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {count.products?.nombre ?? 'Producto no encontrado'}
                </p>
                <p className="text-xs text-gray-400">
                  {count.cantidad} {count.unidad_medida}
                  {count.fecha_vencimiento && ` · Vence: ${count.fecha_vencimiento}`}
                </p>
              </div>
              <SemaforoChip resultado={toSemaforoOutput(count)} compact />
            </div>

            {/* Transcription */}
            {count.transcripcion_voz && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Mic className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 italic">&ldquo;{count.transcripcion_voz}&rdquo;</p>
              </div>
            )}

            {/* Photo evidence link */}
            {count.foto_evidencia_url && (
              <a
                href={count.foto_evidencia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver foto de evidencia
              </a>
            )}

            {/* Metadata chips */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {count.estado_empaque.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {count.observacion_visual.replace(/_/g, ' ')}
              </span>
              {count.captura_metodo === 'voz' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">
                  voz
                </span>
              )}
              {count.semaforo_metodo_calculo === 'estimado_por_recepcion' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">
                  estimado
                </span>
              )}
            </div>

            {/* Supervisor extended view: razón + acción */}
            {isSupervisorOrAdmin && count.semaforo_color !== 'verde' && (
              <div className="border-t border-gray-100 pt-2 space-y-1">
                <p className="text-xs text-gray-500">{count.semaforo_razon}</p>
                <p className="text-xs font-medium text-gray-700">
                  → {count.semaforo_accion.replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
