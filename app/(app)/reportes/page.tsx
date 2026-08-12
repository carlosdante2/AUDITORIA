import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ReportesControls } from './ReportesControls'

const BOGOTA = 5 * 3600 * 1000
function ymd(d: Date) { return new Date(d.getTime() - BOGOTA).toISOString().slice(0, 10) }
function one<T>(x: T | T[] | null): T | null { return Array.isArray(x) ? (x[0] ?? null) : x }

const COLOR_CLS: Record<string, string> = {
  VERDE: 'bg-green-100 text-green-800', AMARILLO: 'bg-yellow-100 text-yellow-800',
  NARANJA: 'bg-orange-100 text-orange-800', ROJO: 'bg-red-100 text-red-800', GRIS: 'bg-gray-100 text-gray-600',
}
const ESTADO_LABEL: Record<string, string> = { ABIERTA: 'Abierta', RECONOCIDA: 'Reconocida', CERRADA: 'Cerrada' }

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'supervisor' && rol !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const hoy = new Date()
  const hasta = sp.hasta ?? ymd(hoy)
  const desde = sp.desde ?? ymd(new Date(hoy.getTime() - 30 * 86400000))
  const desdeTs = `${desde}T00:00:00`
  const hastaTs = `${hasta}T23:59:59`

  const tenantId = user.app_metadata?.tenant_id as string

  const [{ data: tenant }, { data: lecturas }, { data: alertas }, { data: estados }] = await Promise.all([
    supabase.from('tenants').select('nombre').eq('id', tenantId).maybeSingle(),
    supabase.from('lecturas_temperatura')
      .select('valor_c, registrado_en, equipos(codigo, tipo)')
      .gte('registrado_en', desdeTs).lte('registrado_en', hastaTs)
      .order('registrado_en', { ascending: false }).limit(2000),
    supabase.from('alertas')
      .select('color, mensaje, estado, creada_en, cerrada_en, regla_version, lotes(codigo_lote, products(nombre))')
      .gte('creada_en', desdeTs).lte('creada_en', hastaTs)
      .order('creada_en', { ascending: false }).limit(1000),
    supabase.from('lote_estado').select('color'),
  ])

  const lec = lecturas ?? []
  const al = alertas ?? []
  const est = estados ?? []

  // Agrupar lecturas por equipo
  const porEquipo: Record<string, { codigo: string; tipo: string; valores: number[]; ultima: string }> = {}
  for (const l of lec) {
    const eq = one(l.equipos as { codigo: string; tipo: string } | { codigo: string; tipo: string }[] | null)
    const key = eq?.codigo ?? '—'
    if (!porEquipo[key]) porEquipo[key] = { codigo: key, tipo: eq?.tipo ?? '', valores: [], ultima: l.registrado_en }
    porEquipo[key].valores.push(Number(l.valor_c))
  }
  const equiposResumen = Object.values(porEquipo)

  const alAbiertas = al.filter((a) => a.estado !== 'CERRADA').length
  const alCerradas = al.filter((a) => a.estado === 'CERRADA').length
  const colorCounts = est.reduce((acc, e) => { acc[e.color] = (acc[e.color] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <style>{`@media print { @page { margin: 14mm } .print\\:hidden { display:none !important } body { -webkit-print-color-adjust:exact; print-color-adjust:exact } }`}</style>

      <ReportesControls desde={desde} hasta={hasta} />

      {/* Encabezado del documento */}
      <div className="border-b border-gray-200 pb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reporte HACCP · Control de temperaturas e inocuidad</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{tenant?.nombre ?? 'Establecimiento'}</h1>
        <p className="text-sm text-gray-500">Período: {desde} a {hasta} · Generado {new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      {/* Resumen de cumplimiento */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">1. Resumen de cumplimiento</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Lecturas de temperatura" value={lec.length} />
          <Kpi label="Equipos monitoreados" value={equiposResumen.length} />
          <Kpi label="No conformidades" value={al.length} />
          <Kpi label="Cerradas / abiertas" value={`${alCerradas} / ${alAbiertas}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['VERDE', 'AMARILLO', 'NARANJA', 'ROJO', 'GRIS'] as const).map((c) => (
            <span key={c} className={`text-xs font-bold px-3 py-1 rounded-full ${COLOR_CLS[c]}`}>{c} {colorCounts[c] ?? 0}</span>
          ))}
          <span className="text-xs text-gray-400 self-center">inventario actual por estado</span>
        </div>
      </section>

      {/* Registro de temperaturas */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">2. Registro de monitorización de temperatura</h2>
        {equiposResumen.length === 0 ? (
          <p className="text-sm text-gray-400">Sin lecturas registradas en el período.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 text-gray-600 text-left">
                <th className="px-3 py-2">Equipo</th><th className="px-3 py-2">Lecturas</th>
                <th className="px-3 py-2">Mín °C</th><th className="px-3 py-2">Máx °C</th><th className="px-3 py-2">Prom °C</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {equiposResumen.map((e) => {
                  const min = Math.min(...e.valores), max = Math.max(...e.valores)
                  const prom = e.valores.reduce((a, b) => a + b, 0) / e.valores.length
                  return (
                    <tr key={e.codigo}>
                      <td className="px-3 py-2 font-medium text-gray-900">{e.codigo}</td>
                      <td className="px-3 py-2 text-gray-600">{e.valores.length}</td>
                      <td className="px-3 py-2 tabular-nums">{min.toFixed(1)}</td>
                      <td className="px-3 py-2 tabular-nums">{max.toFixed(1)}</td>
                      <td className="px-3 py-2 tabular-nums">{prom.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* No conformidades */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">3. No conformidades y acciones correctivas</h2>
        {al.length === 0 ? (
          <p className="text-sm text-gray-400">Sin no conformidades en el período. ✓</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 text-gray-600 text-left">
                <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Producto / lote</th>
                <th className="px-3 py-2">Estado sanit.</th><th className="px-3 py-2">Hallazgo (límite crítico)</th>
                <th className="px-3 py-2">Gestión</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {al.map((a, i) => {
                  const lote = one(a.lotes as { codigo_lote: string | null; products: unknown } | { codigo_lote: string | null; products: unknown }[] | null)
                  const prod = one((lote?.products ?? null) as { nombre: string } | { nombre: string }[] | null)
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(a.creada_en).toLocaleDateString('es-CO', { dateStyle: 'short' })}</td>
                      <td className="px-3 py-2 text-gray-900">{prod?.nombre ?? '—'}{lote?.codigo_lote ? ` · ${lote.codigo_lote}` : ''}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full font-bold ${COLOR_CLS[a.color]}`}>{a.color}</span></td>
                      <td className="px-3 py-2 text-gray-600">{a.mensaje} <span className="text-gray-400">(regla v{a.regla_version})</span></td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{ESTADO_LABEL[a.estado] ?? a.estado}{a.cerrada_en ? ` · ${new Date(a.cerrada_en).toLocaleDateString('es-CO', { dateStyle: 'short' })}` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-4">
        Documento generado automáticamente por AuditorIA. Los registros de temperatura son inmutables y con hora de servidor; las alertas conservan la versión de la regla con la que se dispararon (trazabilidad auditable).
      </p>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
      <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
