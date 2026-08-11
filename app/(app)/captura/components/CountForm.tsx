'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, CheckCircle, Camera } from 'lucide-react'
import { matchByText } from '@/lib/matching'
import { evaluarSemaforo } from '@/lib/semaforo'
import { db } from '@/lib/db'
import { PhotoCapture } from '@/components/PhotoCapture'
import { SemaforoDisplay } from './SemaforoDisplay'
import type { SemaforoOutput } from '@/lib/semaforo'
import type { MatchCandidate } from '@/lib/matching'
import type { ProductCache } from '@/lib/db'

interface CountFormProps {
  sessionId: string
  tenantId: string
  initialQuery?: string
  onSaved?: (localId: string) => void
}

type EstadoEmpaque = 'intacto' | 'dano_leve' | 'roto_abierto_fuga'
type ObservacionVisual = 'normal' | 'dudoso' | 'no_conforme'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CountForm({ sessionId, tenantId, initialQuery = '', onSaved }: CountFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [selectedProduct, setSelectedProduct] = useState<MatchCandidate | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [fechaRecepcion, setFechaRecepcion] = useState('')
  const [estadoEmpaque, setEstadoEmpaque] = useState<EstadoEmpaque>('intacto')
  const [observacion, setObservacion] = useState<ObservacionVisual>('normal')
  const [semaforo, setSemaforo] = useState<SemaforoOutput | null>(null)
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

  function computeSemaforo(
    product: MatchCandidate | null,
    fv: string,
    fr: string,
    empaque: EstadoEmpaque,
    obs: ObservacionVisual,
  ) {
    if (!product) { setSemaforo(null); return }
    const result = evaluarSemaforo({
      subtipo_producto: product.subtipo,
      fecha_vencimiento: fv || null,
      fecha_hoy: todayISO(),
      requiere_fecha_segun_norma: product.requiere_fecha_vencimiento ? 'si' : 'no',
      estado_empaque: empaque,
      observacion_visual: obs,
      fecha_recepcion_o_compra: fr || null,
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
        semaforo_color: semaforo?.color ?? 'verde',
        semaforo_razon: semaforo?.razon ?? '',
        semaforo_accion: semaforo?.accion_sugerida ?? '',
        semaforo_estrategia_circular: semaforo?.estrategia_economia_circular ?? null,
        semaforo_ods: semaforo?.ods_relacionados ?? [],
        metodo_calculo: semaforo?.metodo_calculo ?? 'no_aplica',
        created_at: now,
      },
      status: 'pending',
      attempts: 0,
      created_at: now,
    })

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
      setEstadoEmpaque('intacto')
      setObservacion('normal')
      setSemaforo(null)
      setSaved(false)
      setPhotoBlob(null)
      setPhotoQueued(false)
    }, 1500)
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="0"
              step="0.001"
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                  className={`py-2 px-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
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
                  className={`py-2 px-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                    observacion === val ? activeClass : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Live semaforo */}
          {semaforo && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Estado sanitario</p>
              <SemaforoDisplay resultado={semaforo} />
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
