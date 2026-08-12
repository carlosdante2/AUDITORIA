'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Refrigerator, Plus, Trash2, Power } from 'lucide-react'

interface Equipo { id: string; codigo: string; tipo: string; ubicacion: string | null; activo: boolean }
interface Props { initialEquipos: Equipo[]; tenantId: string }

const TIPOS = [
  { v: 'CAMARA_REFRIG', label: 'Cámara refrigeración' },
  { v: 'CAMARA_CONGEL', label: 'Cámara congelación' },
  { v: 'NEVERA', label: 'Nevera' },
  { v: 'VITRINA', label: 'Vitrina' },
  { v: 'ALMACEN_SECO', label: 'Almacén seco' },
]
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.v, t.label]))

export function EquiposClient({ initialEquipos, tenantId }: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos)
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState('CAMARA_REFRIG')
  const [ubicacion, setUbicacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const supabase = createClient()

  async function add() {
    if (!codigo.trim() || saving) return
    setSaving(true); setErr(null)
    const { data, error } = await supabase
      .from('equipos')
      .insert({ tenant_id: tenantId, codigo: codigo.trim(), tipo, ubicacion: ubicacion.trim() || null })
      .select('id, codigo, tipo, ubicacion, activo').single()
    if (error) setErr(error.message.includes('duplicate') ? 'Ya existe un equipo con ese código.' : error.message)
    else { setEquipos((p) => [...p, data as Equipo].sort((a, b) => a.codigo.localeCompare(b.codigo))); setCodigo(''); setUbicacion('') }
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Equipos de frío</h1>
        <p className="text-sm text-gray-500">Cámaras y neveras donde se almacenan los lotes. Base para las reglas de temperatura.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código (ej. CAM-01)"
          className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        <div className="flex gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="flex-1 h-11 rounded-lg border border-gray-300 px-2 text-sm bg-white">
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ubicación (opcional)"
            className="flex-1 h-11 rounded-lg border border-gray-300 px-3 text-sm" />
        </div>
        <button onClick={add} disabled={!codigo.trim() || saving} className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" />Crear equipo
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>

      <div className="space-y-2">
        {equipos.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aún no hay equipos.</p>}
        {equipos.map((e) => (
          <div key={e.id} className={`bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 ${!e.activo ? 'opacity-50' : ''}`}>
            <Refrigerator className="w-5 h-5 text-cyan-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{e.codigo}</p>
              <p className="text-xs text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo}{e.ubicacion ? ` · ${e.ubicacion}` : ''}</p>
            </div>
            <button onClick={() => toggle(e)} className={`p-1.5 rounded-lg ${e.activo ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title={e.activo ? 'Desactivar' : 'Activar'}>
              <Power className="w-4 h-4" />
            </button>
            <button onClick={() => del(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
