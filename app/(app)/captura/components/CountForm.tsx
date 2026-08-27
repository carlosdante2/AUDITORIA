'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, CheckCircle, Camera } from 'lucide-react'
import { matchByText } from '@/lib/matching'
import { evaluarLoteOffline } from '@/lib/reglas-offline'
import { estrategiaRecomendada, odsDeEstrategia } from '@/lib/economia-circular'
import { db } from '@/lib/db'
import { PhotoCapture } from '@/components/PhotoCapture'
import { SemaforoDisplay } from './SemaforoDisplay'
import type { ResultadoLote, Color } from '@/lib/reglas-engine'
import type { MatchCandidate } from '@/lib/matching'

interface EquipoOpt { id: string; codigo: string; tipo: string }

interface CountFormProps {
  sessionId: string
  tenantId: string
  initialQuery?: string
  equipos?: EquipoOpt[]
  onSaved?: (localId: string) => void
}

type EstadoEmpaque = 'intacto' | 'dano_leve' | 'roto_abierto_fuga'
type ObservacionVisual = 'normal' | 'dudoso' | 'no_conforme'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// El motor configurable no tiene un tipo "empaque/observación". El hallazgo del
// auditor se traduce a estado_cuarentena, y una regla CUARENTENA (configurable)
// lo colorea. Cero cableado: el color lo decide la regla del admin.
function mapCuarentena(empaque: EstadoEmpaque, obs: ObservacionVisual): string {
  if (empaque === 'roto_abierto_fuga' || obs === 'no_conforme') return 'NO_CONFORME'
  if (empaque === 'dano_leve' || obs === 'dudoso') return 'EN_EVALUACION'
  return 'LIBRE'
}

const SEVERIDAD: Record<Color, number> = { VERDE: 0, GRIS: 1, AMARILLO: 2, NARANJA: 3, ROJO: 4 }

// Dimensión que determinó el color, para persistir razón/acción legibles.
function dimensionDominante(res: ResultadoLote) {
  return [...res.detalle].sort((a, b) => SEVERIDAD[b.color] - SEVERIDAD[a.color])[0] ?? null
}

export function CountForm({ sessionId, tenantId, initialQuery = '', equipos = [], onSaved }: CountFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [selectedProduct, setSelectedProduct] = useState<MatchCandidate | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [fechaRecepcion, setFechaRecepcion] = useState('')
  const [codigoLote, setCodigoLote] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [loteColor, setLoteColor] = useState<string | null>(null)
  const [estadoEmpaque, setEstadoEmpaque] = useState<EstadoEmpaque>('intacto')
  const [observacion, setObservacion] = useState<ObservacionVisual>('normal')
  const [semaforo, setSemaforo] = useState<ResultadoLote | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoQueued, setPhotoQueued] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial query results
  useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setCandidates([])
      return
    }
    const results = await matchByText(q, tenantId)
    setCandidates(results)
  }, [tenantId])

  function handleQueryChange(val: string) {
    setQuery(val)
    setSelectedProduct(null)
    setSemaforo(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), 300)
  }

  function selectProduct(candidate: MatchCandidate) {
    setSelectedProduct(candidate)
    setQuery(candidate.nombre)
    setCandidates([])
    // Recompute semaforo with new product
    computeSemaforo(candidate, fechaVencimiento, fechaRecepcion, estadoEmpaque, observacion)
  }

  async function computeSemaforo(
    product: MatchCandidate | null,
    fv: string,
    _fr: string,
    empaque: EstadoEmpaque,
    obs: ObservacionVisual,
  ) {
    if (!product) { setSemaforo(null); return }
    // Semáforo por reglas, evaluado offline con el mismo motor del servidor (§5.2.5).
    // TEMPERATURA/LECTURA_VENCIDA quedan en GRIS offline; el servidor las resuelve al sincronizar.
    const result = await evaluarLoteOffline(tenantId, {
      producto_id: product.productId,
      categoria_id: product.categoria_id,
      codigo_lote: codigoLote || null,
      proveedor_id: null,
      fecha_vencimiento: fv || null,
      fecha_apertura: null,
      estado_cuarentena: mapCuarentena(empaque, obs),
      cantidad: parseFloat(cantidad) || 0,
      requiere_fecha_vencimiento: product.requiere_fecha_vencimiento,
      temperatura_c: null,
      ultima_lectura_ms: null,
    })
    setSemaforo(result)
  }

  function handleFieldChange<T>(
    setter: (v: T) => void,
    field: 'fv' | 'fr' | 'empaque' | 'obs',
    value: T,
  ) {
    setter(value)
    const fv = field === 'fv' ? (value as string) : fechaVencimiento
    const fr = field === 'fr' ? (value as string) : fechaRecepcion
    const empaque = field === 'empaque' ? (value as EstadoEmpaque) : estadoEmpaque
    const obs = field === 'obs' ? (value as ObservacionVisual) : observacion
    computeSemaforo(selectedProduct, fv, fr, empaque, obs)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct || !cantidad || saving) return

    setSaving(true)
    const localId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Save photo to evidence queue before saving count
    if (photoBlob) {
      await db.photoQueue.add({
        id: localId,
        blob: photoBlob,
        tipo: 'evidencia',
        localCountId: localId,
        tenantId,
        sessionId,
        status: 'pending',
        attempts: 0,
      })
      setPhotoQueued(true)
    }

    const dominante = semaforo ? dimensionDominante(semaforo) : null
    const estrategia = semaforo ? estrategiaRecomendada(semaforo) : null
    await db.countQueue.add({
      local_id: localId,
      session_id: sessionId,
      tenant_id: tenantId,
      data: {
        local_id: localId,
        session_id: sessionId,
        tenant_id: tenantId,
        producto_id: selectedProduct.productId,
        cantidad: parseFloat(cantidad),
        unidad_medida: selectedProduct.unidad_medida,
        fecha_vencimiento: fechaVencimiento || null,
        fecha_recepcion_o_compra: fechaRecepcion || null,
        estado_empaque: estadoEmpaque,
        observacion_visual: observacion,
        // Semáforo por reglas configurables (5 colores, minúsculas en persistencia).
        semaforo_color: (semaforo?.color_final ?? 'GRIS').toLowerCase(),
        semaforo_razon: dominante?.mensaje ?? '',
        semaforo_accion: dominante?.accion ?? 'SOLO_ALERTA',
        semaforo_estrategia_circular: estrategia,
        semaforo_ods: odsDeEstrategia(estrategia),
        semaforo_bloqueo_salida: semaforo?.bloqueo_salida ?? false,
        semaforo_bloqueo_ingreso: semaforo?.bloqueo_ingreso ?? false,
        semaforo_detalle: semaforo?.detalle ?? [],
        created_at: now,
      },
      status: 'pending',
      attempts: 0,
      created_at: now,
    })

    // Crea el lote y lo evalúa con el motor de reglas configurable (online).
    // Offline: el conteo queda en cola; el lote se puede crear luego.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/lotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: selectedProduct.productId,
            cantidad: parseFloat(cantidad),
            fecha_vencimiento: fechaVencimiento || null,
            fecha_recepcion: fechaRecepcion || undefined,
            codigo_lote: codigoLote || null,
            equipo_id: equipoId || null,
          }),
        })
        if (res.ok) { const d = await res.json(); setLoteColor(d.estado?.color_final ?? null) }
      } catch { /* offline / falla — no bloquea la captura */ }
    }

    setSaving(false)
    setSaved(true)
    onSaved?.(localId)

    // Reset for next item
    setTimeout(() => {
      setQuery('')
      setSelectedProduct(null)
      setCandidates([])
      setCantidad('')
      setFechaVencimiento('')
      setFechaRecepcion('')
      setCodigoLote('')
      setEquipoId('')
      setLoteColor(null)
      setEstadoEmpaque('intacto')
      setObservacion('normal')
      setSemaforo(null)
      setSaved(false)
      setPhotoBlob(null)
      setPhotoQueued(false)
    }, 2500)
  }

  const canSubmit = !!selectedProduct && !!cantidad && !saving

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product search */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Producto</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar en catálogo offline…"
            className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
        </div>
        {/* Candidates dropdown */}
        {candidates.length > 0 && !selectedProduct && (
          <ul className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
            {candidates.map((c) => (
              <li key={c.productId}>
                <button
                  type="button"
                  onClick={() => selectProduct(c)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="block text-sm font-medium text-gray-900">{c.nombre}</span>
                  <span className="block text-xs text-gray-400">{c.unidad_medida} · {c.subtipo}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* Selected product badge */}
        {selectedProduct && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">{selectedProduct.nombre}</p>
              <p className="text-xs text-blue-600">{selectedProduct.unidad_medida}</p>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          {/* Cantidad */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Cantidad <span className="font-normal text-gray-400">({selectedProduct.unidad_medida})</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="0"
              step="0.001"
              placeholder="0"
              className="w-full px-4 h-14 rounded-xl border border-gray-300 text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha vencimiento */}
          {selectedProduct.requiere_fecha_vencimiento && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Fecha de vencimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => handleFieldChange(setFechaVencimiento, 'fv', e.target.value)}
                className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Fecha recepción (si no tiene fecha vencimiento) */}
          {!selectedProduct.requiere_fecha_vencimiento && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Fecha de recepción <span className="font-normal text-gray-400">(para estimar vida útil)</span>
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => handleFieldChange(setFechaRecepcion, 'fr', e.target.value)}
                max={todayISO()}
                className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Código de lote (trazabilidad) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Código de lote <span className="font-normal text-gray-400">(opcional, mejora trazabilidad)</span>
            </label>
            <input
              type="text"
              value={codigoLote}
              onChange={(e) => setCodigoLote(e.target.value)}
              placeholder="Ej. L-2026-0812"
              className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
          </div>

          {/* Equipo (cadena de frío) */}
          {equipos.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Equipo <span className="font-normal text-gray-400">(cámara/nevera — para reglas de temperatura)</span>
              </label>
              <select
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin equipo asignado</option>
                {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.codigo}</option>)}
              </select>
            </div>
          )}

          {/* Estado del empaque */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Estado del empaque</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['intacto', 'Intacto', 'border-green-300 bg-green-50 text-green-800'],
                ['dano_leve', 'Daño leve', 'border-yellow-300 bg-yellow-50 text-yellow-800'],
                ['roto_abierto_fuga', 'Roto / fuga', 'border-red-300 bg-red-50 text-red-800'],
              ] as const).map(([val, label, activeClass]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleFieldChange(setEstadoEmpaque, 'empaque', val)}
                  className={`min-h-[52px] px-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    estadoEmpaque === val ? activeClass : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Observación visual */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Observación visual</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['normal', 'Normal', 'border-green-300 bg-green-50 text-green-800'],
                ['dudoso', 'Dudoso', 'border-yellow-300 bg-yellow-50 text-yellow-800'],
                ['no_conforme', 'No conforme', 'border-red-300 bg-red-50 text-red-800'],
              ] as const).map(([val, label, activeClass]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleFieldChange(setObservacion, 'obs', val)}
                  className={`min-h-[52px] px-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    observacion === val ? activeClass : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Live semaforo (motor de reglas, offline) */}
          {semaforo && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Estado sanitario</p>
              <SemaforoDisplay
                resultado={semaforo}
                provisional={typeof navigator !== 'undefined' && !navigator.onLine}
              />
            </div>
          )}

          {/* Photo evidence */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              Foto de evidencia
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            {photoQueued ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <p className="text-xs text-orange-700 font-medium">Foto en cola — se sincronizará al reconectar</p>
              </div>
            ) : (
              <PhotoCapture
                onCapture={(blob) => setPhotoBlob(blob)}
                onClear={() => setPhotoBlob(null)}
                label="Fotografiar producto"
                disabled={saving || saved}
              />
            )}
          </div>

          {/* Resultado del motor configurable (lote) */}
          {loteColor && (
            <div className={`rounded-xl border px-4 py-2.5 text-center text-sm font-bold ${
              loteColor === 'VERDE' ? 'bg-green-50 border-green-200 text-green-800'
              : loteColor === 'AMARILLO' ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : loteColor === 'NARANJA' ? 'bg-orange-50 border-orange-200 text-orange-800'
              : loteColor === 'ROJO' ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              Semáforo por reglas: {loteColor}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saved ? '✓ Guardado — siguiente ítem' : saving ? 'Guardando…' : 'Confirmar conteo'}
          </button>
        </>
      )}
    </form>
  )
}
