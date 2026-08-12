'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Ban, PackageX, Thermometer } from 'lucide-react'

interface Estado { color: string; detalle: Detalle[]; bloqueo_salida: boolean; bloqueo_ingreso: boolean; evaluado_en: string }
interface Detalle { tipo: string; color: string; motivo?: string; mensaje?: string | null; valor_evaluado: number | null; valor_text: string | null }
interface Lote {
  id: string; codigo_lote: string | null; cantidad: number; fecha_vencimiento: string | null
  estado_cuarentena: string; created_at: string
  products: { nombre: string; unidad_medida: string } | { nombre: string; unidad_medida: string }[] | null
  lote_estado: Estado | Estado[] | null
}

const COLOR_CLS: Record<string, string> = {
  VERDE: 'bg-green-100 text-green-800 border-green-300',
  AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  NARANJA: 'bg-orange-100 text-orange-800 border-orange-300',
  ROJO: 'bg-red-100 text-red-800 border-red-300',
  GRIS: 'bg-gray-100 text-gray-600 border-gray-300',
}
const DOT: Record<string, string> = { VERDE: 'bg-green-500', AMARILLO: 'bg-yellow-400', NARANJA: 'bg-orange-500', ROJO: 'bg-red-500', GRIS: 'bg-gray-400' }
const ORDEN = ['ROJO', 'NARANJA', 'AMARILLO', 'GRIS', 'VERDE']

function one<T>(x: T | T[] | null): T | null { return Array.isArray(x) ? (x[0] ?? null) : x }

export function InventarioClient({ initialLotes }: { initialLotes: Lote[] }) {
  const [filtro, setFiltro] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const lotes = useMemo(() => initialLotes.map((l) => ({
    ...l, prod: one(l.products), est: one(l.lote_estado),
  })), [initialLotes])

  const conteos = useMemo(() => {
    const c: Record<string, number> = { ROJO: 0, NARANJA: 0, AMARILLO: 0, GRIS: 0, VERDE: 0 }
    for (const l of lotes) { const col = l.est?.color ?? 'GRIS'; c[col] = (c[col] ?? 0) + 1 }
    return c
  }, [lotes])

  const visibles = filtro ? lotes.filter((l) => (l.est?.color ?? 'GRIS') === filtro) : lotes

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">{lotes.length} lote{lotes.length !== 1 ? 's' : ''} · semáforo según reglas configuradas</p>
        </div>
        <Link href="/temperatura" className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 border border-cyan-200 bg-cyan-50 rounded-lg px-3 h-9">
          <Thermometer className="w-3.5 h-3.5" />Temperatura
        </Link>
      </div>

      {/* Filtros por color */}
      <div className="flex flex-wrap gap-2">
        {ORDEN.map((col) => (
          <button key={col} onClick={() => setFiltro(filtro === col ? null : col)}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-bold transition-all ${filtro === col ? COLOR_CLS[col] + ' ring-2 ring-offset-1' : 'bg-white border-gray-200 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${DOT[col]}`} />{col} {conteos[col] ?? 0}
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          {lotes.length === 0 ? 'Aún no hay lotes. Se crean desde Captura.' : 'Sin lotes en este color.'}
        </p>
      )}

      <div className="space-y-2.5">
        {visibles.map((l) => {
          const color = l.est?.color ?? 'GRIS'
          const abierto = expandido === l.id
          return (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandido(abierto ? null : l.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className={`w-3 h-3 rounded-full shrink-0 ${DOT[color]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900 truncate">{l.prod?.nombre ?? 'Producto'}</p>
                  <p className="text-xs text-gray-400">
                    {l.cantidad} {l.prod?.unidad_medida ?? ''}
                    {l.codigo_lote && ` · lote ${l.codigo_lote}`}
                    {l.fecha_vencimiento && ` · vence ${l.fecha_vencimiento}`}
                  </p>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${COLOR_CLS[color]}`}>{color}</span>
                {abierto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {abierto && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                  {(l.est?.bloqueo_salida || l.est?.bloqueo_ingreso) && (
                    <div className="flex flex-wrap gap-2">
                      {l.est?.bloqueo_salida && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700"><Ban className="w-3 h-3" />Bloquea salida</span>}
                      {l.est?.bloqueo_ingreso && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700"><PackageX className="w-3 h-3" />Bloquea ingreso</span>}
                    </div>
                  )}
                  {(l.est?.detalle ?? []).length === 0 && <p className="text-xs text-gray-400">Sin evaluación aún.</p>}
                  {(l.est?.detalle ?? []).map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">{d.tipo}</span>
                      <span className="flex items-center gap-2 min-w-0">
                        {d.motivo && <span className="text-[10px] text-gray-400 shrink-0">{d.motivo}</span>}
                        {d.mensaje && <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{d.mensaje}</span>}
                        <span className={`px-2 py-0.5 rounded-full border shrink-0 ${COLOR_CLS[d.color]}`}>{d.color}</span>
                      </span>
                    </div>
                  ))}
                  {l.est?.evaluado_en && <p className="text-[10px] text-gray-400 pt-1">Evaluado {new Date(l.est.evaluado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
