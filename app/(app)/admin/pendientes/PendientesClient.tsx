'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

const VALID_SUBTIPOS = [
  'carne_res','carne_cerdo','pollo','pescado','mariscos','lacteo','lacteo_fresco',
  'preparado_cocina','fruta_verdura_cortada_o_pelada','huevo','frutas_verduras',
  'hojas_verdes','hierbas_frescas','tomate','pepino','pimenton','calabacin',
  'zanahoria','remolacha','papa','cebolla','ajo','banano','citricos','manzana',
  'pera','mango','papaya','pina','berries','aguacate','bebida_refrigerada',
  'jugos_refrigerados','panaderia','panaderia_vida_corta','enlatado','conserva',
  'granos_secos','bebida','bebida_estable','aceite_grasa','agua','hielo_empaquetado',
  'galletas_cereales','leche_en_polvo','cafe_te','azucar_sal',
]

interface MatchCandidate { product_id: string; nombre: string; score: number }

interface PendingProduct {
  id: string
  nombre_sugerido: string
  unidad_sugerida: string
  subtipo_sugerido: string | null
  origen: string
  match_candidates: MatchCandidate[] | null
  created_at: string
}

interface PendientesClientProps {
  initialPending: PendingProduct[]
  userId: string
}

interface FormState {
  nombre: string
  unidad: string
  subtipo: string
  requiere_fecha: boolean
}

export function PendientesClient({ initialPending, userId }: PendientesClientProps) {
  const [items, setItems]     = useState<PendingProduct[]>(initialPending)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [forms, setForms]     = useState<Record<string, FormState>>({})
  const [busy, setBusy]       = useState<string | null>(null)
  const [msg, setMsg]         = useState<Record<string, string>>({})

  function getForm(item: PendingProduct): FormState {
    return forms[item.id] ?? {
      nombre:         item.nombre_sugerido,
      unidad:         item.unidad_sugerida,
      subtipo:        item.subtipo_sugerido ?? 'frutas_verduras',
      requiere_fecha: true,
    }
  }

  function setForm(id: string, patch: Partial<FormState>) {
    setForms((prev) => ({ ...prev, [id]: { ...getForm({ id } as PendingProduct), ...patch } }))
  }

  async function approve(item: PendingProduct) {
    setBusy(item.id)
    const form = getForm(item)
    const supabase = createClient()

    try {
      // 1. Insert new product
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert({
          nombre: form.nombre,
          unidad_medida: form.unidad,
          subtipo: form.subtipo,
          requiere_fecha_vencimiento: form.requiere_fecha,
          estado: 'activo',
        })
        .select('id')
        .single()

      if (insertError || !newProduct) throw new Error(insertError?.message ?? 'Insert failed')

      // 2. Mark pending as approved
      await supabase
        .from('pending_products')
        .update({
          estado: 'aprobado',
          aprobado_por: userId,
          producto_aprobado_id: newProduct.id,
        })
        .eq('id', item.id)

      // 3. Trigger embedding generation (T052)
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: newProduct.id }),
        }
      )

      setItems((prev) => prev.filter((p) => p.id !== item.id))
      setMsg((prev) => ({ ...prev, [item.id]: '✓ Aprobado' }))
    } catch (err) {
      setMsg((prev) => ({ ...prev, [item.id]: `Error: ${err instanceof Error ? err.message : 'desconocido'}` }))
    } finally {
      setBusy(null)
    }
  }

  async function reject(item: PendingProduct) {
    setBusy(item.id)
    const supabase = createClient()
    await supabase
      .from('pending_products')
      .update({ estado: 'rechazado' })
      .eq('id', item.id)

    setItems((prev) => prev.filter((p) => p.id !== item.id))
    setBusy(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Productos pendientes</h1>
        <p className="text-sm text-gray-500">{items.length} en espera de aprobación</p>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">Sin productos pendientes. ✓</p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const form = getForm(item)
          const isExpanded = expanded === item.id
          const isBusy = busy === item.id

          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.nombre_sugerido}</p>
                  <p className="text-xs text-gray-400">{item.unidad_sugerida} · {item.origen}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  {/* Candidates */}
                  {item.match_candidates && item.match_candidates.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 mt-2">Candidatos del catálogo</p>
                      {item.match_candidates.map((c) => (
                        <div key={c.product_id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                          <span className="text-gray-700">{c.nombre}</span>
                          <span className="text-gray-400 font-medium">{Math.round(c.score * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Approval form */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Datos para crear producto</p>
                    <input
                      value={form.nombre}
                      onChange={(e) => setForm(item.id, { nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre normalizado"
                    />
                    <div className="flex gap-2">
                      <input
                        value={form.unidad}
                        onChange={(e) => setForm(item.id, { unidad: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Unidad"
                      />
                      <select
                        value={form.subtipo}
                        onChange={(e) => setForm(item.id, { subtipo: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {VALID_SUBTIPOS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.requiere_fecha}
                        onChange={(e) => setForm(item.id, { requiere_fecha: e.target.checked })}
                        className="rounded"
                      />
                      Requiere fecha de vencimiento
                    </label>
                  </div>

                  {msg[item.id] && (
                    <p className="text-xs text-green-600 font-medium">{msg[item.id]}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => approve(item)}
                      disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isBusy ? 'Procesando…' : 'Aprobar y crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(item)}
                      disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold disabled:opacity-50 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
