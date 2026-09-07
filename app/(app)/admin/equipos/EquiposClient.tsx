'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Refrigerator, Plus, Trash2, Power, MapPin, Pencil, Check, X } from 'lucide-react'

interface SeccionOpt { id: string; nombre: string; estado: string }
interface SedeOpt { id: string; nombre: string; secciones: SeccionOpt[] }

interface Equipo {
  id: string; codigo: string; tipo: string; ubicacion: string | null; activo: boolean
  sede_id: string | null; seccion_id: string | null
  sedes: { nombre: string } | { nombre: string }[] | null
  secciones: { nombre: string } | { nombre: string }[] | null
}
interface Props { initialEquipos: Equipo[]; sedes: SedeOpt[]; tenantId: string }

const TIPOS = [
  { v: 'CAMARA_REFRIG', label: 'Cámara refrigeración' },
  { v: 'CAMARA_CONGEL', label: 'Cámara congelación' },
  { v: 'NEVERA', label: 'Nevera' },
  { v: 'VITRINA', label: 'Vitrina' },
  { v: 'ALMACEN_SECO', label: 'Almacén seco' },
]
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.v, t.label]))

function one<T>(x: T | T[] | null): T | null { return Array.isArray(x) ? (x[0] ?? null) : x }

// Texto legible "Sede · Sección · detalle libre" — con lo que haya disponible.
function ubicacionLabel(e: Equipo): string | null {
  const sede = one(e.sedes)?.nombre
  const seccion = one(e.secciones)?.nombre
  const partes = [sede, seccion, e.ubicacion].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : null
}

export function EquiposClient({ initialEquipos, sedes, tenantId }: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos)
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState('CAMARA_REFRIG')
  const [sedeId, setSedeId] = useState('')
  const [seccionId, setSeccionId] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editSedeId, setEditSedeId] = useState('')
  const [editSeccionId, setEditSeccionId] = useState('')
  const [editUbicacion, setEditUbicacion] = useState('')
  const supabase = createClient()

  const seccionesDe = (sId: string) => sedes.find((s) => s.id === sId)?.secciones.filter((x) => x.estado === 'activo') ?? []

  async function add() {
    if (!codigo.trim() || saving) return
    setSaving(true); setErr(null)
    const { data, error } = await supabase
      .from('equipos')
      .insert({
        tenant_id: tenantId, codigo: codigo.trim(), tipo,
        sede_id: sedeId || null, seccion_id: seccionId || null,
        ubicacion: ubicacion.trim() || null,
      })
      .select('id, codigo, tipo, ubicacion, activo, sede_id, seccion_id, sedes(nombre), secciones(nombre)').single()
    if (error) setErr(error.message.includes('duplicate') ? 'Ya existe un equipo con ese código.' : error.message)
    else {
      setEquipos((p) => [...p, data as Equipo].sort((a, b) => a.codigo.localeCompare(b.codigo)))
      setCodigo(''); setSedeId(''); setSeccionId(''); setUbicacion('')
    }
    setSaving(false)
  }

  async function toggle(e: Equipo) {
    const activo = !e.activo
    const { error } = await supabase.from('equipos').update({ activo }).eq('id', e.id)
    if (!error) setEquipos((p) => p.map((x) => (x.id === e.id ? { ...x, activo } : x)))
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    setErr(null)
    const { error } = await supabase.from('equipos').delete().eq('id', id)
    if (error) setErr('No se puede eliminar: el equipo tiene lotes o lecturas asociadas. Desactívalo en su lugar.')
    else setEquipos((p) => p.filter((x) => x.id !== id))
  }

  function abrirEdicion(e: Equipo) {
    setEditId(e.id)
    setEditSedeId(e.sede_id ?? '')
    setEditSeccionId(e.seccion_id ?? '')
    setEditUbicacion(e.ubicacion ?? '')
  }

  async function guardarUbicacion(id: string) {
    const { data, error } = await supabase
      .from('equipos')
      .update({ sede_id: editSedeId || null, seccion_id: editSeccionId || null, ubicacion: editUbicacion.trim() || null })
      .eq('id', id)
      .select('id, codigo, tipo, ubicacion, activo, sede_id, seccion_id, sedes(nombre), secciones(nombre)').single()
    if (!error && data) setEquipos((p) => p.map((x) => (x.id === id ? (data as Equipo) : x)))
    setEditId(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Equipos de frío</h1>
        <p className="text-sm text-gray-500">Cámaras y neveras donde se almacenan los lotes. Base para las reglas de temperatura.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código (ej. CAM-01)"
          className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white">
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={sedeId} onChange={(e) => { setSedeId(e.target.value); setSeccionId('') }}
            className="flex-1 h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white">
            <option value="">Sede (opcional)…</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select value={seccionId} onChange={(e) => setSeccionId(e.target.value)} disabled={!sedeId}
            className="flex-1 h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400">
            <option value="">Sección…</option>
            {seccionesDe(sedeId).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Detalle dentro de la sección (opcional, ej. rincón izquierdo)"
          className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        <button onClick={add} disabled={!codigo.trim() || saving} className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" />Crear equipo
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>

      <div className="space-y-2">
        {equipos.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aún no hay equipos.</p>}
        {equipos.map((e) => (
          <div key={e.id} className={`bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-2 ${!e.activo ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <Refrigerator className="w-5 h-5 text-cyan-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{e.codigo}</p>
                <p className="text-xs text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>
                {ubicacionLabel(e) ? (
                  <p className="text-xs text-cyan-700 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{ubicacionLabel(e)}</p>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />Sin ubicación asignada</p>
                )}
              </div>
              <button onClick={() => abrirEdicion(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar ubicación"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => toggle(e)} className={`p-1.5 rounded-lg ${e.activo ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title={e.activo ? 'Desactivar' : 'Activar'}>
                <Power className="w-4 h-4" />
              </button>
              <button onClick={() => del(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>

            {editId === e.id && (
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <div className="flex gap-2">
                  <select value={editSedeId} onChange={(ev) => { setEditSedeId(ev.target.value); setEditSeccionId('') }}
                    className="flex-1 h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white">
                    <option value="">Sede…</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                  <select value={editSeccionId} onChange={(ev) => setEditSeccionId(ev.target.value)} disabled={!editSedeId}
                    className="flex-1 h-9 rounded-lg border border-gray-300 px-2 text-xs bg-white disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">Sección…</option>
                    {seccionesDe(editSedeId).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                </div>
                <input value={editUbicacion} onChange={(ev) => setEditUbicacion(ev.target.value)} placeholder="Detalle (opcional)"
                  className="w-full h-9 rounded-lg border border-gray-300 px-2 text-xs" />
                <div className="flex gap-2">
                  <button onClick={() => guardarUbicacion(e.id)} className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" />Guardar</button>
                  <button onClick={() => setEditId(null)} className="flex-1 h-9 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold inline-flex items-center justify-center gap-1"><X className="w-3.5 h-3.5" />Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
