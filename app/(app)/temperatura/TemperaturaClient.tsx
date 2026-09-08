'use client'

import { useState } from 'react'
import { Refrigerator, Thermometer, Check, MapPin, History, ChevronDown, ChevronUp, User } from 'lucide-react'

interface Lectura { valor_c: number; registrado_en: string; usuario_id?: string | null; profiles?: { nombre: string } | { nombre: string }[] | null }
interface Equipo {
  id: string; codigo: string; tipo: string; ubicacion: string | null
  sede_id?: string | null; seccion_id?: string | null
  sedes?: { nombre: string } | { nombre: string }[] | null
  secciones?: { nombre: string } | { nombre: string }[] | null
  lecturas_temperatura: Lectura[] | Lectura | null
}

const TIPO_LABEL: Record<string, string> = {
  CAMARA_REFRIG: 'Cámara refrigeración', CAMARA_CONGEL: 'Cámara congelación',
  NEVERA: 'Nevera', VITRINA: 'Vitrina', ALMACEN_SECO: 'Almacén seco',
}

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

function historial(l: Equipo['lecturas_temperatura']): Lectura[] {
  const arr = Array.isArray(l) ? l : l ? [l] : []
  return arr.slice().sort((a, b) => new Date(b.registrado_en).getTime() - new Date(a.registrado_en).getTime())
}

// Ubicación real (sede · sección), con el detalle libre al final si existe.
function ubicacionLabel(e: Equipo): string | null {
  const sede = one(e.sedes)?.nombre
  const seccion = one(e.secciones)?.nombre
  const partes = [sede, seccion, e.ubicacion].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : null
}

function nombreDe(l: Lectura, currentUserName: string): string {
  return one(l.profiles)?.nombre ?? (l.usuario_id ? 'Usuario' : currentUserName)
}

export function TemperaturaClient({ initialEquipos, currentUserName }: { initialEquipos: Equipo[]; currentUserName: string }) {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})

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
      // Antepone la nueva lectura al historial en memoria (más reciente primero).
      const nueva: Lectura = { valor_c: valor, registrado_en: data.registrado_en, profiles: { nombre: currentUserName } }
      setEquipos((p) => p.map((e) => e.id === equipoId
        ? { ...e, lecturas_temperatura: [nueva, ...historial(e.lecturas_temperatura)].slice(0, 10) }
        : e))
      setValores((v) => ({ ...v, [equipoId]: '' }))
      setMsg((m) => ({ ...m, [equipoId]: `✓ Registrada · ${data.lotes_reevaluados} lote(s) re-evaluado(s)` }))
    } catch {
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
          const hist = historial(e.lecturas_temperatura)
          const ult = hist[0] ?? null
          const isBusy = busy === e.id
          const abierto = !!expandido[e.id]
          const ubicacion = ubicacionLabel(e)
          return (
            <div key={e.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Refrigerator className="w-5 h-5 text-cyan-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900 truncate">{e.codigo}</p>
                  <p className="text-xs text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>
                  {ubicacion ? (
                    <p className="text-xs text-cyan-700 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{ubicacion}</p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />Sin ubicación — pídele al admin que la asigne</p>
                  )}
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

              {/* Historial de lecturas: hora, fecha y quién la registró */}
              {hist.length > 0 && (
                <div className="border-t border-gray-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setExpandido((p) => ({ ...p, [e.id]: !p[e.id] }))}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    <History className="w-3.5 h-3.5" />
                    Historial ({hist.length})
                    {abierto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {abierto && (
                    <ul className="mt-2 space-y-1.5">
                      {hist.map((l, i) => (
                        <li key={i} className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-300 shrink-0" />
                            {nombreDe(l, currentUserName)}
                          </span>
                          <span className="tabular-nums">{l.valor_c}°C</span>
                          <span className="text-gray-400">
                            {new Date(l.registrado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
