'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Check, CheckCheck, Clock } from 'lucide-react'

interface Alerta {
  id: string
  color: string
  mensaje: string
  valor_evaluado: number | null
  estado: string
  creada_en: string
  cerrada_en: string | null
  regla_version: number
  lotes: { codigo_lote: string | null; products: { nombre: string } | { nombre: string }[] | null } | { codigo_lote: string | null; products: { nombre: string } | { nombre: string }[] | null }[] | null
}

const COLOR_CLS: Record<string, string> = {
  VERDE: 'bg-green-100 text-green-800 border-green-300',
  AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  NARANJA: 'bg-orange-100 text-orange-800 border-orange-300',
  ROJO: 'bg-red-100 text-red-800 border-red-300',
  GRIS: 'bg-gray-100 text-gray-600 border-gray-300',
}
const TABS = [
  { v: 'ABIERTA', label: 'Abiertas' },
  { v: 'RECONOCIDA', label: 'Reconocidas' },
  { v: 'CERRADA', label: 'Cerradas' },
]

function one<T>(x: T | T[] | null): T | null { return Array.isArray(x) ? (x[0] ?? null) : x }

export function AlertasClient({ initialAlertas, userId }: { initialAlertas: Alerta[]; userId: string }) {
  const [alertas, setAlertas] = useState<Alerta[]>(initialAlertas)
  const [tab, setTab] = useState('ABIERTA')
  const [busy, setBusy] = useState<string | null>(null)
  const supabase = createClient()

  const conteos = useMemo(() => {
    const c: Record<string, number> = { ABIERTA: 0, RECONOCIDA: 0, CERRADA: 0 }
    for (const a of alertas) c[a.estado] = (c[a.estado] ?? 0) + 1
    return c
  }, [alertas])

  const visibles = alertas.filter((a) => a.estado === tab)

  async function reconocer(id: string) {
    setBusy(id)
    const { error } = await supabase.from('alertas').update({ estado: 'RECONOCIDA', reconocida_por: userId }).eq('id', id)
    if (!error) setAlertas((p) => p.map((a) => (a.id === id ? { ...a, estado: 'RECONOCIDA' } : a)))
    setBusy(null)
  }
  async function cerrar(id: string) {
    setBusy(id)
    const cerrada_en = new Date().toISOString()
    const { error } = await supabase.from('alertas').update({ estado: 'CERRADA', cerrada_en }).eq('id', id)
    if (!error) setAlertas((p) => p.map((a) => (a.id === id ? { ...a, estado: 'CERRADA', cerrada_en } : a)))
    setBusy(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        <p className="text-sm text-gray-500">Hallazgos del semáforo. Reconoce y cierra según se resuelvan.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${tab === t.v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>
            {t.label} <span className={tab === t.v ? 'text-gray-300' : 'text-gray-400'}>{conteos[t.v] ?? 0}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">Sin alertas {tab === 'ABIERTA' ? 'abiertas' : tab === 'RECONOCIDA' ? 'reconocidas' : 'cerradas'}.</p>
      )}

      <div className="space-y-2.5">
        {visibles.map((a) => {
          const lote = one(a.lotes)
          const prod = one(lote?.products ?? null)
          const isBusy = busy === a.id
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">{prod?.nombre ?? 'Producto'}</p>
                  <p className="text-xs text-gray-400">
                    {lote?.codigo_lote ? `Lote ${lote.codigo_lote} · ` : ''}regla v{a.regla_version}
                    {a.valor_evaluado !== null ? ` · valor ${a.valor_evaluado}` : ''}
                  </p>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border shrink-0 ${COLOR_CLS[a.color]}`}>{a.color}</span>
              </div>

              <p className="text-sm text-gray-700">{a.mensaje}</p>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(a.creada_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <div className="flex items-center gap-2">
                  {a.estado === 'ABIERTA' && (
                    <button onClick={() => reconocer(a.id)} disabled={isBusy}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" />Reconocer
                    </button>
                  )}
                  {a.estado !== 'CERRADA' && (
                    <button onClick={() => cerrar(a.id)} disabled={isBusy}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
                      <CheckCheck className="w-3.5 h-3.5" />Cerrar
                    </button>
                  )}
                  {a.estado === 'CERRADA' && a.cerrada_en && (
                    <span className="text-xs text-gray-400">Cerrada {new Date(a.cerrada_en).toLocaleDateString('es-CO', { dateStyle: 'short' })}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
