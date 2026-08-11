'use client'

import { useCallback, useRef, useState } from 'react'
import { Mic, MicOff, Clock, AlertCircle } from 'lucide-react'
import { db } from '@/lib/db'
import { AudioQueueStatus } from '@/components/AudioQueueStatus'

interface VoiceCaptureProps {
  sessionId: string
  onTranscription?: (text: string, localId: string) => void
}

type RecordingState = 'idle' | 'recording' | 'queued' | 'processing' | 'error'

export function VoiceCapture({ sessionId, onTranscription }: VoiceCaptureProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const localIdRef = useRef<string>('')

  const startRecording = useCallback(async () => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await handleRecordingComplete(blob, mimeType)
      }

      localIdRef.current = crypto.randomUUID()
      recorder.start()
      mediaRecorderRef.current = recorder
      setState('recording')
    } catch {
      setState('error')
      setErrorMsg('No se pudo acceder al micrófono')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  async function handleRecordingComplete(blob: Blob, mimeType: string) {
    const localId = localIdRef.current

    // Always save to Dexie first — offline-first guarantee
    await db.audioQueue.add({
      id: localId,
      blob,
      mimeType,
      recordedAt: Date.now(),
      sessionId,
      status: 'pending',
      attempts: 0,
    })

    if (!navigator.onLine) {
      setState('queued')
      return
    }

    // Attempt immediate processing if online
    setState('processing')
    try {
      const formData = new FormData()
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      formData.append('audio', blob, `audio.${ext}`)
      formData.append('mimeType', mimeType)
      formData.append('local_id', localId)
      formData.append('language', 'es')

      const res = await fetch('/api/voz', { method: 'POST', body: formData })

      if (res.ok) {
        const data = await res.json()
        await db.audioQueue.delete(localId)
        setState('idle')
        onTranscription?.(data.transcription as string, localId)
      } else {
        // Server-side error — item stays in queue for retry
        setState('queued')
      }
    } catch {
      // Network failure — item stays in Dexie for flush when back online
      setState('queued')
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hold-to-record button */}
      <button
        type="button"
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        disabled={state === 'processing'}
        aria-label={state === 'recording' ? 'Suelta para detener grabación' : 'Mantén presionado para grabar'}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-150
          focus-visible:outline-none focus-visible:ring-4
          ${state === 'recording'
            ? 'bg-red-500 scale-110 ring-4 ring-red-300 focus-visible:ring-red-300'
            : state === 'processing'
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95 focus-visible:ring-blue-300'}
        `}
      >
        {state === 'recording' ? (
          <MicOff className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>

      {/* State label */}
      <div className="h-5 flex items-center justify-center">
        {state === 'recording' && (
          <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Grabando… suelta para enviar
          </span>
        )}
        {state === 'queued' && (
          <span className="flex items-center gap-1.5 text-sm text-yellow-700 font-medium">
            <Clock className="w-4 h-4" />
            Audio en cola — se procesará al reconectar
          </span>
        )}
        {state === 'processing' && (
          <span className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Transcribiendo…
          </span>
        )}
        {state === 'error' && errorMsg && (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </span>
        )}
      </div>

      {/* Persistent queue status */}
      <AudioQueueStatus currentState={state === 'recording' ? 'recording' : state === 'processing' ? 'processing' : 'idle'} />
    </div>
  )
}
