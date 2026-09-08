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

interface SeccionOpt {
  id: string
  nombre: string
  estado: string
}

interface SedeOpt {
  id: string
  nombre: string
  secciones: SeccionOpt[]
}

interface EquipoOpt {
  id: string
  codigo: string
  tipo: string
}

interface CapturaPageClientProps {
  tenantId: string
  initialSessions: Session[]
  sedes: SedeOpt[]
  equipos: EquipoOpt[]
}

export function CapturaPageClient({
  tenantId,
  initialSessions,
  sedes,
  equipos,
}: CapturaPageClientProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sedeId, setSedeId] = useState('')
  const [seccionId, setSeccionId] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transcription, setTranscription] = useState<string | undefined>(
    undefined
  )
  const [countsSaved, setCountsSaved] = useState(0)

  const selectedSede = sedes.find((s) => s.id === sedeId)

  const seccionesActivas = (selectedSede?.secciones ?? []).filter(
    (x) => x.estado === 'activo'
  )

  async function createSession() {
    const sede = sedes.find((s) => s.id === sedeId)
    const seccion = seccionesActivas.find((x) => x.id === seccionId)

    if (!sede || !seccion || creating) return

    setCreating(true)

    const bodega = `${sede.nombre} · ${seccion.nombre}`
    const supabase = createClient()

    const { data, error } = await supabase
      .from('audit_sessions')
      .insert({
        tenant_id: tenantId,
        bodega,
        sede_id: sede.id,
        seccion_id: seccion.id,
      })
      .select('id, bodega, estado, opened_at')
      .single()

    setCreating(false)

    if (!error && data) {
      const session = data as Session

      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setSedeId('')
      setSeccionId('')
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
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Sesión activa
            </p>

            <p className="text-base font-bold text-gray-900">
              {activeSession.bodega}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <OfflineIndicator />

            <button
              type="button"
              onClick={() => setActiveSession(null)}
              className="flex h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-600 hover:text-blue-700"
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-center text-sm font-semibold text-gray-600">
            Mantén presionado para capturar por voz
          </p>

          <VoiceCapture
            sessionId={activeSession.id}
            onTranscription={handleTranscription}
          />
        </div>

        {/* Transcripción visible */}
        {transcription && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Transcripción detectada
            </p>

            <p className="mt-2 text-sm text-gray-800">
              “{transcription}”
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Revisa que la información sea correcta antes de guardar el
              producto.
            </p>
          </div>
        )}

        {/* Count form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">
              Registrar producto
            </p>

            {countsSaved > 0 && (
              <span className="text-xs font-medium text-green-600">
                {countsSaved} guardado{countsSaved > 1 ? 's' : ''} en cola
              </span>
            )}
          </div>

          <CountForm
            sessionId={activeSession.id}
            tenantId={tenantId}
            initialQuery={transcription}
            equipos={equipos}
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
          <h1 className="text-xl font-bold text-gray-900">
            Captura de inventario
          </h1>

          <p className="text-sm text-gray-500">
            Selecciona o abre una sesión de auditoría
          </p>
        </div>

        <OfflineIndicator />
      </div>

      {/* New session */}
      {sedes.length === 0 ? (
        <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-bold text-amber-800">
            No hay sedes configuradas
          </p>

          <p className="text-sm text-amber-700">
            Pide al administrador que configure las sedes y secciones antes de
            iniciar una auditoría.
          </p>
        </div>
      ) : showForm ? (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700">
            Nueva sesión de auditoría
          </p>

          {/* Sede */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Sede
            </label>

            <select
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value)
                setSeccionId('')
              }}
              className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una sede…</option>

              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Sección */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Sección
            </label>

            <select
              value={seccionId}
              onChange={(e) => setSeccionId(e.target.value)}
              disabled={!sedeId}
              className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!sedeId
                  ? 'Primero elige una sede'
                  : seccionesActivas.length === 0
                    ? 'Esta sede no tiene secciones'
                    : 'Selecciona una sección…'}
              </option>

              {seccionesActivas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setSedeId('')
                setSeccionId('')
              }}
              className="h-12 flex-1 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={createSession}
              disabled={!sedeId || !seccionId || creating}
              className="h-12 flex-1 rounded-xl bg-blue-600 text-sm font-bold text-white transition-transform hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {creating ? 'Creando…' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva sesión de auditoría
        </button>
      )}

      {/* Sessions list */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Sesiones abiertas
          </p>

          {sessions
            .filter((s) => s.estado === 'abierta')
            .map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setActiveSession(session)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/30"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {session.bodega}
                  </p>

                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />

                    {new Date(session.opened_at).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Abierta
                  </span>

                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
        </div>
      )}

      {sessions.length === 0 && !showForm && sedes.length > 0 && (
        <p className="py-8 text-center text-sm text-gray-400">
          No hay sesiones activas. Inicia una nueva para comenzar la auditoría.
        </p>
      )}
    </div>
  )
}
