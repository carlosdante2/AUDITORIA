'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { VoiceCapture } from './VoiceCapture'
import { CountForm } from './CountForm'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { AudioQueueStatus } from '@/components/AudioQueueStatus'
import { Plus, ChevronRight, Clock } from 'lucide-react'

interface Session {
  id: string
  bodega: string
  estado: string
  opened_at: string
}

interface CapturaPageClientProps {
  tenantId: string
  initialSessions: Session[]
}

export function CapturaPageClient({ tenantId, initialSessions }: CapturaPageClientProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [bodegaInput, setBodegaInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transcription, setTranscription] = useState<string | undefined>(undefined)
  const [countsSaved, setCountsSaved] = useState(0)

  async function createSession() {
    if (!bodegaInput.trim() || creating) return
    setCreating(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('audit_sessions')
      .insert({ tenant_id: tenantId, bodega: bodegaInput.trim() })
      .select('id, bodega, estado, opened_at')
      .single()

    setCreating(false)
    if (!error && data) {
      const session = data as Session
      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setBodegaInput('')
      setShowForm(false)
    }
  }

  function handleTranscription(text: string) {
    setTranscription(text)
  }

  function handleCountSaved() {
    setCountsSaved((n) => n + 1)
    setTranscription(undefined)
  }

  if (activeSession) {
    return (
      <div className="space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sesión activa</p>
            <p className="text-base font-bold text-gray-900">{activeSession.bodega}</p>
          </div>
          <div className="flex items-center gap-3">
            <OfflineIndicator />
            <button
              type="button"
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-3 h-9 rounded-lg border border-blue-200 bg-blue-50"
            >
              Cambiar bodega
            </button>
          </div>
        </div>

        {/* Audio queue status */}
        <div className="flex justify-center">
          <AudioQueueStatus />
        </div>

        {/* Voice capture */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-600 mb-4 text-center">
            Mantén presionado para capturar por voz
          </p>
          <VoiceCapture
            sessionId={activeSession.id}
            onTranscription={handleTranscription}
          />
        </div>

        {/* Count form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700">Registrar producto</p>
            {countsSaved > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {countsSaved} guardado{countsSaved > 1 ? 's' : ''} en cola
              </span>
            )}
          </div>
          <CountForm
            sessionId={activeSession.id}
            tenantId={tenantId}
            initialQuery={transcription}
            onSaved={handleCountSaved}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Captura de inventario</h1>
          <p className="text-sm text-gray-500">Selecciona o abre una sesión de auditoría</p>
        </div>
        <OfflineIndicator />
      </div>

      {/* New session */}
      {showForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nueva sesión de auditoría</p>
          <input
            type="text"
            value={bodegaInput}
            onChange={(e) => setBodegaInput(e.target.value)}
            placeholder="Nombre de la bodega (ej. Bodega Principal)"
            className="w-full px-4 h-12 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && createSession()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 h-12 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={createSession}
              disabled={!bodegaInput.trim() || creating}
              className="flex-1 h-12 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-blue-700 active:scale-[0.98] transition-transform"
            >
              {creating ? 'Creando…' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva sesión de auditoría
        </button>
      )}

      {/* Sessions list */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sesiones abiertas</p>
          {sessions
            .filter((s) => s.estado === 'abierta')
            .map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setActiveSession(session)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{session.bodega}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(session.opened_at).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    Abierta
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-8">
          No hay sesiones activas. Inicia una nueva para comenzar la auditoría.
        </p>
      )}
    </div>
  )
}
