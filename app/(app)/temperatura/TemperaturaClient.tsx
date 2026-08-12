'use client'

import { useState } from 'react'
import { Refrigerator, Thermometer, Check } from 'lucide-react'

interface Lectura { valor_c: number; registrado_en: string }
interface Equipo {
  id: string; codigo: string; tipo: string; ubicacion: string | null
  lecturas_temperatura: Lectura[] | Lectura | null
}

const TIPO_LABEL: Record<string, string> = {
  CAMARA_REFRIG: 'Cámara refrigeración', CAMARA_CONGEL: 'Cámara congelación',
  NEVERA: 'Nevera', VITRINA: 'Vitrina', ALMACEN_SECO: 'Almacén seco',
}

function ultimaLectura(l: Equipo['lecturas_temperatura']): Lectura | null {
  const arr = Array.isArray(l) ? l : l ? [l] : []
  if (arr.length === 0) return null
  return arr.slice().sort((a, b) => new Date(b.registrado_en).getTime() - new Date(a.registrado_en).getTime())[0]
}

export function TemperaturaClient({ initialEquipos }: { initialEquipos: Equipo[] }) {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})

  async function registrar(equipoId: string) {
    const raw = valores[equipoId]
    const valor = Number(raw)
    if (raw === undefined || raw === '' || Number.isNaN(valor)) return
    setBusy(equipoId); setMsg((m) => ({ ...m, [equipoId]: '' }))
    try {
      const res = await fetch('/api/lecturas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipo_id: equipoId, valor_c: valor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      // refresca última lectura en memoria
      const nueva: Lectura = { valor_c: valor, registrado_en: data.registrado_en }
      setEquipos((p) => p.map((e) => e.id === equipoId ? { ...e, lecturas_temperatura: [nueva] } : e))
      setValores((v) => ({ ...v, [equipoId]: '' }))
      setMsg((m) => ({ ...m, [equipoId]: `✓ Registrada · ${data.lotes_reevaluados} lote(s) re-evaluado(s)` }))
    } catch (err) {
      setMsg((m) => ({ ...m, [equipoId]: 'Error al registrar' }))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Temperatura</h1>
        <p className="text-sm text-gray-500">Registra la lectura de cada equipo. Se re-evalúan los lotes al guardar.</p>
      </div>

      {equipos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No hay equipos activos. El administrador los crea en Equipos de frío.</p>
      )}

      <div className="space-y-3">
        {equipos.map((e) => {
          const ult = ultimaLectura(e.lecturas_temperatura)
          const isBusy = busy === e.id
          return (
            <div key={e.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Refrigerator className="w-5 h-5 text-cyan-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900 truncate">{e.codigo}</p>
                  <p className="text-xs text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo}{e.ubicacion ? ` · ${e.ubicacion}` : ''}</p>
                </div>
                {ult && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-gray-900 tabular-nums">{ult.valor_c}°C</p>
                    <p className="text-[10px] text-gray-400">{new Date(ult.registrado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" inputMode="decimal" step="0.1"
                    value={valores[e.id] ?? ''}
                    onChange={(ev) => setValores((v) => ({ ...v, [e.id]: ev.target.value }))}
                    placeholder="°C"
                    className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-300 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button onClick={() => registrar(e.id)} disabled={isBusy || !(valores[e.id] ?? '').trim()}
                  className="px-5 h-12 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" />{isBusy ? '…' : 'Registrar'}
                </button>
              </div>
              {msg[e.id] && <p className={`text-xs ${msg[e.id].startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg[e.id]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
