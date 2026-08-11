'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/db'

interface QueueCounts {
  audio: number
  photos: number
  counts: number
}

export function OfflineIndicator() {
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<QueueCounts>({ audio: 0, photos: 0, counts: 0 })

  useEffect(() => {
    setOnline(navigator.onLine)

    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    async function updateCounts() {
      const [audio, photos, counts] = await Promise.all([
        db.audioQueue.where('status').anyOf(['pending', 'error']).count(),
        db.photoQueue.where('status').anyOf(['pending', 'error']).count(),
        db.countQueue.where('status').anyOf(['pending', 'error']).count(),
      ])
      setQueue({ audio, photos, counts })
    }

    updateCounts()
    const interval = setInterval(updateCounts, 5000)
    return () => clearInterval(interval)
  }, [])

  const totalPending = queue.audio + queue.photos + queue.counts
  const hasQueue = totalPending > 0

  if (online && !hasQueue) return null

  return (
    <div
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium ${
        online
          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${online ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}
      />
      {online ? (
        <span>Sincronizando {totalPending} {totalPending === 1 ? 'ítem' : 'ítems'}…</span>
      ) : (
        <span>
          Sin conexión{hasQueue ? ` — ${totalPending} ${totalPending === 1 ? 'ítem pendiente' : 'ítems pendientes'}` : ''}
        </span>
      )}
    </div>
  )
}
