'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, Edit2, Power } from 'lucide-react'

interface Product {
  id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  requiere_fecha_vencimiento: boolean
  estado: string
  updated_at: string
}

interface CatalogoClientProps {
  initialProducts: Product[]
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

export function CatalogoClient({ initialProducts }: CatalogoClientProps) {
  const [products, setProducts]   = useState<Product[]>(initialProducts)
  const [query, setQuery]         = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData]   = useState<Partial<Product>>({})
  const [saving, setSaving]       = useState(false)

  const filtered = products.filter((p) =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    p.subtipo.includes(query.toLowerCase())
  )

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditData({ nombre: p.nombre, unidad_medida: p.unidad_medida, subtipo: p.subtipo })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ nombre: editData.nombre, unidad_medida: editData.unidad_medida, subtipo: editData.subtipo })
      .eq('id', id)

    if (!error) {
      setProducts((prev) => prev.map((p) =>
        p.id === id ? { ...p, ...editData } : p
      ))
    }
    setEditingId(null)
    setSaving(false)
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
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.unidad_medida} · {p.subtipo}</p>
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
                    className={`p-1.5 rounded-lg ${p.estado === 'activo' ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                    aria-label={p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  >
                    <Power className="w-4 h-4" />
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
