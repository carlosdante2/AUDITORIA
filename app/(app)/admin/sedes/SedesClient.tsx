'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Building2, Plus, Trash2, ChevronDown, ChevronUp, Edit2, X, MapPin, Check,
} from 'lucide-react'

interface Seccion { id: string; nombre: string; estado: string }
interface Sede {
  id: string
  nombre: string
  direccion: string | null
  estado: string
  secciones: Seccion[]
}

interface SedesClientProps {
  initialSedes: Sede[]
  tenantId: string
}

export function SedesClient({ initialSedes, tenantId }: SedesClientProps) {
  const [sedes, setSedes]       = useState<Sede[]>(initialSedes)
  const [showNew, setShowNew]   = useState(false)
  const [newNombre, setNewNombre]       = useState('')
  const [newDireccion, setNewDireccion] = useState('')
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [seccionInputs, setSeccionInputs] = useState<Record<string, string>>({})
  const [busy, setBusy]         = useState<string | null>(null)
  const [confirmDeleteSede, setConfirmDeleteSede] = useState<string | null>(null)
  const [editingSede, setEditingSede] = useState<string | null>(null)
  const [editNombre, setEditNombre]   = useState('')

  const supabase = createClient()

  async function addSede() {
    if (!newNombre.trim() || saving) return
    setSaving(true)
    const { data, error } = await supabase
      .from('sedes')
      .insert({ tenant_id: tenantId, nombre: newNombre.trim(), direccion: newDireccion.trim() || null })
      .select('id, nombre, direccion, estado')
      .single()
    if (!error && data) {
      const nueva: Sede = { ...(data as Omit<Sede, 'secciones'>), secciones: [] }
      setSedes((prev) => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNewNombre(''); setNewDireccion(''); setShowNew(false)
      setExpanded(nueva.id)
    }
    setSaving(false)
  }

  function startEditSede(s: Sede) {
    setEditingSede(s.id)
    setEditNombre(s.nombre)
  }

  async function saveEditSede(id: string) {
    if (!editNombre.trim()) return
    const { error } = await supabase.from('sedes').update({ nombre: editNombre.trim() }).eq('id', id)
    if (!error) {
      setSedes((prev) => prev.map((s) => (s.id === id ? { ...s, nombre: editNombre.trim() } : s)))
    }
    setEditingSede(null)
  }

  async function deleteSede(id: string) {
    setBusy(id)
    const { error } = await supabase.from('sedes').delete().eq('id', id)
    if (!error) setSedes((prev) => prev.filter((s) => s.id !== id))
    setConfirmDeleteSede(null)
    setBusy(null)
  }

  async function addSeccion(sedeId: string) {
    const nombre = (seccionInputs[sedeId] ?? '').trim()
    if (!nombre) return
    setBusy(sedeId)
    const { data, error } = await supabase
      .from('secciones')
      .insert({ tenant_id: tenantId, sede_id: sedeId, nombre })
      .select('id, nombre, estado')
      .single()
    if (!error && data) {
      setSedes((prev) => prev.map((s) =>
        s.id === sedeId ? { ...s, secciones: [...s.secciones, data as Seccion] } : s
      ))
      setSeccionInputs((prev) => ({ ...prev, [sedeId]: '' }))
    }
    setBusy(null)
  }

  async function deleteSeccion(sedeId: string, seccionId: string) {
    const { error } = await supabase.from('secciones').delete().eq('id', seccionId)
    if (!error) {
      setSedes((prev) => prev.map((s) =>
        s.id === sedeId ? { ...s, secciones: s.secciones.filter((x) => x.id !== seccionId) } : s
      ))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sedes y secciones</h1>
        <p className="text-sm text-gray-500">{sedes.length} sede{sedes.length !== 1 ? 's' : ''} configurada{sedes.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-800 leading-relaxed">
          Define cada <span className="font-semibold">sede</span> (almacén, local o punto) y dentro de ella sus{' '}
          <span className="font-semibold">secciones</span> (cámara fría, almacén seco, recepción…).
          Los auditores elegirán sede y sección de una lista al iniciar cada auditoría.
        </p>
      </div>

      {/* New sede */}
      {showNew ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nueva sede</p>
          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Nombre (ej. Sede Norte)"
            className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <input
            value={newDireccion}
            onChange={(e) => setNewDireccion(e.target.value)}
            placeholder="Dirección (opcional)"
            className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowNew(false); setNewNombre(''); setNewDireccion('') }}
              className="flex-1 h-11 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={addSede}
              disabled={!newNombre.trim() || saving}
              className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-blue-700"
            >
              {saving ? 'Guardando…' : 'Crear sede'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nueva sede
        </button>
      )}

      {sedes.length === 0 && !showNew && (
        <p className="text-sm text-gray-400 text-center py-8">
          Aún no hay sedes. Crea la primera para que los auditores puedan seleccionarla.
        </p>
      )}

      {/* Sedes list */}
      <div className="space-y-3">
        {sedes.map((sede) => {
          const isExpanded = expanded === sede.id
          const isBusy = busy === sede.id
          return (
            <div key={sede.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Sede header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                {editingSede === sede.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="flex-1 px-3 h-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button type="button" onClick={() => saveEditSede(sede.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setEditingSede(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : sede.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">{sede.nombre}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {sede.direccion && (<><MapPin className="w-3 h-3" />{sede.direccion} · </>)}
                        {sede.secciones.length} secci{sede.secciones.length === 1 ? 'ón' : 'ones'}
                      </p>
                    </button>
                    <button type="button" onClick={() => startEditSede(sede)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" aria-label="Editar sede">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteSede(sede.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" aria-label="Eliminar sede">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : sede.id)} className="p-1.5 text-gray-400" aria-label="Expandir">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>

              {/* Delete confirm */}
              {confirmDeleteSede === sede.id && (
                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-red-50 border-t border-red-100">
                  <p className="text-sm text-red-700">¿Eliminar <span className="font-bold">{sede.nombre}</span> y sus secciones?</p>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => deleteSede(sede.id)} disabled={isBusy} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">
                      {isBusy ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteSede(null)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Secciones */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                  {sede.secciones.length === 0 && (
                    <p className="text-xs text-gray-400">Sin secciones. Agrega la primera abajo.</p>
                  )}
                  {sede.secciones.map((sec) => (
                    <div key={sec.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700">{sec.nombre}</span>
                      <button
                        type="button"
                        onClick={() => deleteSeccion(sede.id, sec.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label="Eliminar sección"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={seccionInputs[sede.id] ?? ''}
                      onChange={(e) => setSeccionInputs((prev) => ({ ...prev, [sede.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addSeccion(sede.id)}
                      placeholder="Nueva sección (ej. Cámara fría)"
                      className="flex-1 px-3 h-11 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => addSeccion(sede.id)}
                      disabled={!(seccionInputs[sede.id] ?? '').trim() || isBusy}
                      className="px-4 h-11 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
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
