'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Edit2, Power, Trash2, Zap, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Product {
  id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  requiere_fecha_vencimiento: boolean
  estado: string
  updated_at: string
  categoria_id: string | null
}

interface Categoria { id: string; nombre: string }

interface CatalogoClientProps {
  initialProducts: Product[]
  missingEmbeddings: number
  categorias: Categoria[]
}

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

export function CatalogoClient({ initialProducts, missingEmbeddings, categorias }: CatalogoClientProps) {
  const catNombre = (id: string | null) => categorias.find((c) => c.id === id)?.nombre ?? null
  const [products, setProducts]       = useState<Product[]>(initialProducts)
  const [query, setQuery]             = useState('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editData, setEditData]       = useState<Partial<Product>>({})
  const [saving, setSaving]           = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [embedState, setEmbedState]   = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [embedResult, setEmbedResult] = useState<{ generated: number; errors: number } | null>(null)
  const [missing, setMissing]         = useState(missingEmbeddings)

  const filtered = products.filter((p) =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    p.subtipo.includes(query.toLowerCase())
  )

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditData({ nombre: p.nombre, unidad_medida: p.unidad_medida, subtipo: p.subtipo, categoria_id: p.categoria_id })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ nombre: editData.nombre, unidad_medida: editData.unidad_medida, subtipo: editData.subtipo, categoria_id: editData.categoria_id ?? null })
      .eq('id', id)

    if (!error) {
      setProducts((prev) => prev.map((p) =>
        p.id === id ? { ...p, ...editData } : p
      ))
    }
    setEditingId(null)
    setSaving(false)
  }

  async function generateEmbeddings(force = false) {
    if (embedState === 'running') return
    setEmbedState('running')
    setEmbedResult(null)
    try {
      const res = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEmbedResult(data)
      setEmbedState(data.errors > 0 ? 'error' : 'done')
      if (data.generated > 0) setMissing(0)
    } catch {
      setEmbedState('error')
    }
  }

  async function deleteProduct(id: string) {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  async function toggleEstado(p: Product) {
    const nuevoEstado = p.estado === 'activo' ? 'inactivo' : 'activo'
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ estado: nuevoEstado })
      .eq('id', p.id)

    if (!error) {
      setProducts((prev) => prev.map((pr) =>
        pr.id === p.id ? { ...pr, estado: nuevoEstado } : pr
      ))
    }
  }

  const activos   = products.filter((p) => p.estado === 'activo').length
  const inactivos = products.filter((p) => p.estado === 'inactivo').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Catálogo de productos</h1>
        <p className="text-sm text-gray-500">{activos} activos · {inactivos} inactivos</p>
      </div>

      {/* Embeddings panel */}
      {embedState === 'idle' && missing > 0 && (
        <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-800">
              {missing} producto{missing > 1 ? 's' : ''} sin indexar
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Sin embeddings la búsqueda por voz usa solo texto. Genéralos para habilitar búsqueda semántica.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateEmbeddings(false)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
          >
            <Zap className="w-3.5 h-3.5" />
            Indexar
          </button>
        </div>
      )}

      {embedState === 'running' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">Generando embeddings con Jina AI…</p>
            <p className="text-xs text-blue-600 mt-0.5">Esto puede tomar unos segundos</p>
          </div>
        </div>
      )}

      {embedState === 'done' && embedResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm font-bold text-green-800">
                {embedResult.generated} producto{embedResult.generated !== 1 ? 's' : ''} indexado{embedResult.generated !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => generateEmbeddings(true)}
              className="text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
            >
              Re-indexar todos
            </button>
          </div>
          <p className="text-xs text-green-600">La búsqueda por voz ahora usará coincidencia semántica.</p>
        </div>
      )}

      {embedState === 'error' && (
        <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                {embedResult ? `${embedResult.generated} generados, ${embedResult.errors} con error` : 'Error al conectar con Jina AI'}
              </p>
              <p className="text-xs text-red-600 mt-0.5">Verifica que JINA_API_KEY esté configurada en Vercel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEmbedState('idle'); setEmbedResult(null) }}
            className="shrink-0 text-xs text-red-600 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o subtipo…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className={`bg-white rounded-xl border p-4 space-y-2 ${p.estado === 'inactivo' ? 'opacity-50' : ''}`}>
            {editingId === p.id ? (
              <div className="space-y-2">
                <input
                  value={editData.nombre ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, nombre: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre"
                />
                <div className="flex gap-2">
                  <input
                    value={editData.unidad_medida ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, unidad_medida: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unidad"
                  />
                  <select
                    value={editData.subtipo ?? ''}
                    onChange={(e) => setEditData((d) => ({ ...d, subtipo: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VALID_SUBTIPOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <select
                  value={editData.categoria_id ?? ''}
                  onChange={(e) => setEditData((d) => ({ ...d, categoria_id: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin categoría (para reglas por categoría)</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(p.id)}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : confirmDeleteId === p.id ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-red-700 font-medium">¿Eliminar <span className="font-bold">{p.nombre}</span>?</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => deleteProduct(p.id)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {p.unidad_medida} · {p.subtipo}
                    {catNombre(p.categoria_id) && <span className="ml-1 text-indigo-500">· {catNombre(p.categoria_id)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                    aria-label="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEstado(p)}
                    className={`p-1.5 rounded-lg ${p.estado === 'activo' ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                    aria-label={p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    title={p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setConfirmDeleteId(p.id) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Eliminar"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin resultados para &quot;{query}&quot;</p>
        )}
      </div>
    </div>
  )
}
