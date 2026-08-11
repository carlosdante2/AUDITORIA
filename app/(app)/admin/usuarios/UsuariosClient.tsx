'use client'

import { useState } from 'react'
import { UserPlus, CheckCircle, AlertTriangle } from 'lucide-react'

interface Profile { id: string; nombre: string; created_at: string }
interface UsuariosClientProps { initialProfiles: Profile[] }

export function UsuariosClient({ initialProfiles }: UsuariosClientProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [email, setEmail]       = useState('')
  const [nombre, setNombre]     = useState('')
  const [rol, setRol]           = useState('auditor')
  const [status, setStatus]     = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg]           = useState('')

  async function invite() {
    if (!email.trim() || !nombre.trim() || status === 'sending') return
    setStatus('sending')
    setMsg('')

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), nombre: nombre.trim(), rol }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Error al invitar usuario')

      setStatus('done')
      setMsg(`✓ ${nombre} invitado como ${rol}`)
      setEmail('')
      setNombre('')
      setRol('auditor')
      setProfiles((prev) => [
        { id: data.user_id, nombre: nombre.trim(), created_at: new Date().toISOString() },
        ...prev,
      ])
    } catch (err) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gestión de usuarios</h1>
        <p className="text-sm text-gray-500">{profiles.length} usuario{profiles.length !== 1 ? 's' : ''} en el equipo</p>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invitar usuario
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auditor">Auditor</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@hotel.com"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && invite()}
        />

        <button
          type="button"
          onClick={invite}
          disabled={!email.trim() || !nombre.trim() || status === 'sending'}
          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {status === 'sending' ? 'Enviando invitación…' : 'Invitar usuario'}
        </button>

        {msg && (
          <div className={`flex items-center gap-2 text-sm ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {status === 'error'
              ? <AlertTriangle className="w-4 h-4 shrink-0" />
              : <CheckCircle className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Equipo</p>
        {profiles.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
              <p className="text-xs text-gray-400">
                Desde {new Date(p.created_at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Invita el primer usuario.</p>
        )}
      </div>
    </div>
  )
}
