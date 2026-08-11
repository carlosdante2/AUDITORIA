'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PhotoCapture } from '@/components/PhotoCapture'
import { CheckCircle, AlertTriangle, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

type Step = 'photo' | 'extracting' | 'review' | 'confirming' | 'done'

interface InvoiceItem {
  descripcion: string
  cantidad: number | null
  unidad: string
  precio_unitario: number | null
}

interface MatchResult {
  producto_id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  score: number
  requiere_fecha_vencimiento: boolean
}

interface ReviewItem {
  invoice: InvoiceItem
  matches: MatchResult[]
  below_threshold: boolean
  // User decisions
  selectedProductId: string | null
  confirmedCantidad: number | null
  isEditing: boolean
}

interface NuevaRecepcionClientProps {
  tenantId: string
  auditorId: string
}

export function NuevaRecepcionClient({ tenantId, auditorId }: NuevaRecepcionClientProps) {
  const [step, setStep] = useState<Step>('photo')
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [receptionId, setReceptionId] = useState<string | null>(null)
  const [proveedor, setProveedor] = useState('')
  const [items, setItems] = useState<ReviewItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  function handlePhotoCapture(blob: Blob, url: string) {
    setPhotoBlob(blob)
    setPhotoBlobUrl(url)
    setErrorMsg(null)
  }

  async function handleExtract() {
    if (!photoBlob) return
    setStep('extracting')
    setErrorMsg(null)

    try {
      const supabase = createClient()

      // 1. Create reception record (borrador)
      const { data: reception, error: recError } = await supabase
        .from('receptions')
        .insert({ tenant_id: tenantId, auditor_id: auditorId, estado: 'borrador' })
        .select('id')
        .single()

      if (recError || !reception) throw new Error('No se pudo crear la recepción')
      const recId = reception.id as string
      setReceptionId(recId)

      // 2. Upload photo to Supabase Storage
      const fileName = `${tenantId}/${recId}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('invoice-photos')
        .upload(fileName, photoBlob, { contentType: 'image/jpeg', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('invoice-photos').getPublicUrl(fileName)
        await supabase
          .from('receptions')
          .update({ foto_factura_url: urlData.publicUrl })
          .eq('id', recId)
      }

      // 3. Call /api/vision to extract items
      const formData = new FormData()
      formData.append('image', photoBlob, 'factura.jpg')
      formData.append('reception_id', recId)

      const visionRes = await fetch('/api/vision', { method: 'POST', body: formData })
      if (!visionRes.ok) {
        const err = await visionRes.json()
        throw new Error(err.message ?? 'Error de visión')
      }

      const visionData = await visionRes.json()
      if (visionData.proveedor) setProveedor(visionData.proveedor)

      const extractedItems: InvoiceItem[] = visionData.items ?? []
      if (extractedItems.length === 0) throw new Error('No se detectaron productos en la factura')

      // 4. Match each item against catalog (parallel)
      const matchPromises = extractedItems.map((item) =>
        fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: item.descripcion, tenant_id: tenantId }),
        }).then((r) => r.json())
      )

      const matchResults = await Promise.all(matchPromises)

      const reviewItems: ReviewItem[] = extractedItems.map((item, i) => {
        const res = matchResults[i]
        const matches: MatchResult[] = res.matches ?? []
        const below = res.below_threshold ?? true
        return {
          invoice: item,
          matches,
          below_threshold: below,
          selectedProductId: below ? null : (matches[0]?.producto_id ?? null),
          confirmedCantidad: item.cantidad,
          isEditing: false,
        }
      })

      setItems(reviewItems)
      setStep('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado')
      setStep('photo')
    }
  }

  function setItemProduct(idx: number, productId: string | null) {
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, selectedProductId: productId, isEditing: false } : it
    ))
  }

  function setItemCantidad(idx: number, qty: number | null) {
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, confirmedCantidad: qty } : it
    ))
  }

  function toggleEditing(idx: number) {
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, isEditing: !it.isEditing } : it
    ))
  }

  async function handleConfirm() {
    if (!receptionId) return
    setStep('confirming')
    setErrorMsg(null)

    try {
      const supabase = createClient()
      let hasPending = false

      for (const item of items) {
        const estado = item.selectedProductId ? 'confirmado' : 'pendiente_aprobacion'
        if (estado === 'pendiente_aprobacion') hasPending = true

        // Insert reception_item
        const { data: riData } = await supabase
          .from('reception_items')
          .insert({
            reception_id: receptionId,
            tenant_id: tenantId,
            producto_id: item.selectedProductId ?? null,
            descripcion_extraida: item.invoice.descripcion,
            cantidad: item.confirmedCantidad,
            precio_unitario: item.invoice.precio_unitario,
            match_score: item.matches[0]?.score ?? null,
            estado,
          })
          .select('id')
          .single()

        // If no match → create pending_product
        if (!item.selectedProductId && riData) {
          await supabase.from('pending_products').insert({
            tenant_id: tenantId,
            nombre_sugerido: item.invoice.descripcion,
            unidad_sugerida: item.invoice.unidad || 'unidades',
            subtipo_sugerido: null,
            origen: 'factura',
            recepcion_item_id: riData.id,
            match_candidates: item.matches.length > 0
              ? item.matches.map((m) => ({ product_id: m.producto_id, nombre: m.nombre, score: m.score }))
              : null,
            estado: 'pendiente',
          })
        }
      }

      // Update reception estado
      await supabase
        .from('receptions')
        .update({
          estado: hasPending ? 'con_pendientes' : 'confirmada',
          proveedor: proveedor || null,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', receptionId)

      setStep('done')
      setTimeout(() => router.push(`/recepcion/${receptionId}`), 1500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al confirmar')
      setStep('review')
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-base font-bold text-gray-900">Recepción confirmada</p>
        <p className="text-sm text-gray-400">Redirigiendo…</p>
      </div>
    )
  }

  if (step === 'extracting') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <span className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-700">Analizando factura con IA…</p>
        <p className="text-xs text-gray-400">Esto puede tomar 10-15 segundos</p>
      </div>
    )
  }

  if (step === 'photo') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva recepción</h1>
          <p className="text-sm text-gray-500">Fotografía la factura del proveedor</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <PhotoCapture
            onCapture={handlePhotoCapture}
            onClear={() => { setPhotoBlob(null); setPhotoBlobUrl(null) }}
            label="Fotografiar factura"
          />

          {errorMsg && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleExtract}
            disabled={!photoBlob}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            Analizar factura →
          </button>
        </div>
      </div>
    )
  }

  // Step: review
  const confirmedCount  = items.filter((i) => i.selectedProductId).length
  const pendingCount    = items.filter((i) => !i.selectedProductId).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Revisar items</h1>
        {proveedor && <p className="text-sm text-gray-500">{proveedor}</p>}
        <p className="text-xs text-gray-400 mt-0.5">
          {confirmedCount} identificado{confirmedCount !== 1 ? 's' : ''} ·{' '}
          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} de aprobación
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <ReviewItemCard
            key={idx}
            item={item}
            idx={idx}
            onSelectProduct={setItemProduct}
            onSetCantidad={setItemCantidad}
            onToggleEditing={toggleEditing}
          />
        ))}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={step === 'confirming'}
        className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {step === 'confirming' ? 'Guardando…' : `Confirmar recepción (${items.length} ítems)`}
      </button>
    </div>
  )
}

// ── ReviewItemCard ────────────────────────────────────────────────

interface ReviewItemCardProps {
  item: ReviewItem
  idx: number
  onSelectProduct: (idx: number, productId: string | null) => void
  onSetCantidad: (idx: number, qty: number | null) => void
  onToggleEditing: (idx: number) => void
}

function ReviewItemCard({ item, idx, onSelectProduct, onSetCantidad, onToggleEditing }: ReviewItemCardProps) {
  const isMatched   = !!item.selectedProductId
  const topMatch    = item.matches[0]
  const matchScore  = topMatch ? Math.round(topMatch.score * 100) : 0
  const borderClass = isMatched
    ? 'border-green-200 bg-green-50/30'
    : item.below_threshold
      ? 'border-yellow-200 bg-yellow-50/30'
      : 'border-gray-200'

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium">Extraído de factura</p>
          <p className="text-sm font-semibold text-gray-800">{item.invoice.descripcion}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleEditing(idx)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Editar"
        >
          {item.isEditing ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Match result */}
      {isMatched && topMatch && !item.isEditing && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">{topMatch.nombre}</p>
            <p className="text-xs text-green-600">{topMatch.unidad_medida} · {matchScore}% coincidencia</p>
          </div>
        </div>
      )}

      {!isMatched && !item.isEditing && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-700">
            Sin coincidencia en catálogo — quedará pendiente de aprobación
          </p>
        </div>
      )}

      {/* Edit panel */}
      {item.isEditing && (
        <div className="space-y-3 pt-1 border-t border-gray-200">
          {/* Candidate selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600">Seleccionar producto del catálogo</p>
            {item.matches.length > 0 ? (
              <div className="space-y-1">
                {item.matches.map((m) => (
                  <button
                    key={m.producto_id}
                    type="button"
                    onClick={() => onSelectProduct(idx, m.producto_id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      item.selectedProductId === m.producto_id
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{m.nombre}</span>
                    <span className="ml-2 text-xs text-gray-400">{Math.round(m.score * 100)}%</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin candidatos del catálogo</p>
            )}
            <button
              type="button"
              onClick={() => onSelectProduct(idx, null)}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                !item.selectedProductId
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Marcar como pendiente (no está en catálogo)
            </button>
          </div>

          {/* Cantidad override */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">Cantidad</p>
            <input
              type="number"
              defaultValue={item.confirmedCantidad ?? ''}
              onChange={(e) => onSetCantidad(idx, e.target.value ? parseFloat(e.target.value) : null)}
              min="0"
              step="0.001"
              placeholder="Cantidad"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Cantidad chip */}
      {!item.isEditing && item.confirmedCantidad != null && (
        <p className="text-xs text-gray-400">
          {item.confirmedCantidad} {item.invoice.unidad || 'unidades'}
          {item.invoice.precio_unitario && ` · $${item.invoice.precio_unitario.toLocaleString('es-CO')}`}
        </p>
      )}
    </div>
  )
}
