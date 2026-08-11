'use client'

import { useEffect } from 'react'

// Flushes offline queues on mount and when the browser goes online.
// Constitution IV: offline-first — flush triggers at startup AND on 'online' event.
export function FlushOnMount() {
  useEffect(() => {
    async function flush() {
      try {
        const { flushAll } = await import('@/lib/sync')
        await flushAll()
      } catch {
        // sync module not available yet — safe to ignore on first render
      }
    }

    // Flush on mount (catches items from previous offline session)
    flush()

    // Flush whenever browser regains connectivity
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  return null
}
