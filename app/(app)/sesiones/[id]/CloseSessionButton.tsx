'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Count {
  nombre: string
  cantidad: number
  unidad_medida: string
  semaforo_color: string
  semaforo_razon: string
  semaforo_accion: string
}

interface CloseSessionButtonProps {
  sessionId: string
  bodega: string
  counts: Count[]
}

export function CloseSessionButton({ sessionId, bodega, counts }: CloseSessionButtonProps) {
  const [state, setState] = useState<'idle' | 'closing' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function closeSession() {
    if (state !== 'idle') return
    setState('closing')

    try {
      const supabase = createClient()

      // 1. Mark session as closed
      const { error: closeError } = await supabase
        .from('audit_sessions')
        .update({ estado: 'cerrada', closed_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (closeError) throw closeError

      // 2. Request Claude haiku insights (optional — never blocks on failure)
      try {
        const res = await fetch('/api/semaforo-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            counts_summary: counts,
            bodega,
            sector: 'alimentos_bebidas',
          }),
        })

        if (res.ok) {
          const { insights } = await res.json()
          if (insights) {
            await supabase
              .from('audit_sessions')
              .update({ insights_ia: insights })
              .eq('id', sessionId)
          }
        }
      } catch {
        // Insights are optional — session is already closed, don't fail
      }

      setState('done')
      setMessage('Auditoría finalizada.')
      router.refresh()
    } catch {
      setState('error')
      setMessage('Error al finalizar. Intenta de nuevo.')
    }
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold">
        ✓ {message}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={closeSession}
        disabled={state === 'closing'}
        className={`px-4 h-11 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
          state === 'closing'
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
        }`}
      >
        {state === 'closing' ? 'Finalizando…' : 'Finalizar auditoría'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-600">{message}</p>
      )}
    </div>
  )
}
