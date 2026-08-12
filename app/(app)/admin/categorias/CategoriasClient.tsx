'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { FolderTree, Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Categoria { id: string; nombre: string; parent_id: string | null }
interface Props { initialCategorias: Categoria[]; tenantId: string }

export function CategoriasClient({ initialCategorias, tenantId }: Props) {
  const [cats, setCats] = useState<Categoria[]>(initialCategorias)
  const [nombre, setNombre] = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const supabase = createClient()

  const nombreDe = (id: string | null) => cats.find((c) => c.id === id)?.nombre ?? null

  async function add() {
    if (!nombre.trim() || saving) return
    setSaving(true); setErr(null)
    const { data, error } = await supabase
      .from('categorias')
      .insert({ tenant_id: tenantId, nombre: nombre.trim(), parent_id: parentId || null })
      .select('id, nombre, parent_id').single()
    if (error) setErr(error.message.includes('duplicate') ? 'Ya existe una categoría con ese nombre.' : error.message)
    else { setCats((p) => [...p, data as Categoria].sort((a, b) => a.nombre.localeCompare(b.nombre))); setNombre(''); setParentId('') }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    if (!editNombre.trim()) return
    const { error } = await supabase.from('categorias').update({ nombre: editNombre.trim() }).eq('id', id)
    if (!error) setCats((p) => p.map((c) => (c.id === id ? { ...c, nombre: editNombre.trim() } : c)))
    setEditId(null)
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    setErr(null)
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) setErr('No se puede eliminar: la categoría tiene productos o subcategorías asociadas.')
    else setCats((p) => p.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Categorías</h1>
        <p className="text-sm text-gray-500">Agrupan productos para asignarles reglas de semáforo por categoría.</p>
      </div>

      {/* Add */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Pescados crudos)"
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        <div className="flex gap-2">
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="flex-1 h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white">
            <option value="">Sin categoría padre</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={add} disabled={!nombre.trim() || saving} className="px-4 h-11 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />Crear
          </button>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>

      {/* List */}
      <div className="space-y-2">
        {cats.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aún no hay categorías.</p>}
        {cats.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <FolderTree className="w-4 h-4 text-indigo-500 shrink-0" />
            {editId === c.id ? (
              <>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus
                  className="flex-1 h-9 rounded-lg border border-gray-300 px-2 text-sm" />
                <button onClick={() => saveEdit(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.nombre}</p>
                  {c.parent_id && <p className="text-xs text-gray-400">↳ dentro de {nombreDe(c.parent_id)}</p>}
                </div>
                <button onClick={() => { setEditId(c.id); setEditNombre(c.nombre) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
