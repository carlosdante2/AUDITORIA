'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { Mic, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type AudioState = 'idle' | 'recording' | 'queued' | 'processing' | 'done' | 'error'

interface AudioQueueStatusProps {
  currentState?: AudioState
}

export function AudioQueueStatus({ currentState = 'idle' }: AudioQueueStatusProps) {
  const [pendingCount, setPendingCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    async function refresh() {
      const [pending, errors] = await Promise.all([
        db.audioQueue.where('status').equals('pending').count(),
        db.audioQueue.where('status').equals('error').count(),
      ])
      setPendingCount(pending)
      setErrorCount(errors)
    }

    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [])

  // Transient recording/processing states take priority over queue counts
  if (currentState === 'recording') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        <Mic className="w-3.5 h-3.5 animate-pulse" />
        Grabando…
      </span>
    )
  }

  if (currentState === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Procesando voz…
      </span>
    )
  }

  if (currentState === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
        <CheckCircle className="w-3.5 h-3.5" />
        Transcrito
      </span>
    )
  }

  const total = pendingCount + errorCount

  if (total === 0) return null

  if (errorCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertCircle className="w-3.5 h-3.5" />
        {errorCount} audio{errorCount > 1 ? 's' : ''} con error
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-700">
      <Clock className="w-3.5 h-3.5" />
      {pendingCount} audio{pendingCount > 1 ? 's' : ''} en cola
    </span>
  )
}
