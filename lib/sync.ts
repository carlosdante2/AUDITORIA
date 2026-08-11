import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase'

// Sync module — flushes offline queues to Supabase.
// Triggered: (1) on app mount, (2) on 'online' event — Constitution IV.
// Each queue is independent; a failure in one doesn't block the others.

export async function flushAudioQueue(): Promise<void> {
  const pending = await db.audioQueue
    .where('status')
    .anyOf(['pending', 'error'])
    .and((item) => item.attempts < 3)
    .toArray()

  for (const item of pending) {
    await db.audioQueue.update(item.id, { status: 'processing' })

    try {
      const formData = new FormData()
      formData.append('audio', item.blob, `audio.${item.mimeType.split('/')[1] || 'webm'}`)
      formData.append('mimeType', item.mimeType)
      formData.append('local_id', item.id)
      formData.append('language', 'es')

      const res = await fetch('/api/voz', { method: 'POST', body: formData })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Remove from queue on success — the calling component handles the transcription result
      await db.audioQueue.delete(item.id)
    } catch (err) {
      await db.audioQueue.update(item.id, {
        status: 'error',
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function flushCountQueue(): Promise<void> {
  const pending = await db.countQueue
    .where('status')
    .anyOf(['pending', 'error'])
    .and((item) => item.attempts < 3)
    .toArray()

  if (pending.length === 0) return

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: pending.map((p) => p.data) }),
      }
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const result = await res.json()

    // Remove successfully processed items (processed + skipped = dedup OK)
    const processedIds = pending
      .filter((_, i) => !(result.errors ?? []).some((e: { local_id: string }) => e.local_id === pending[i].local_id))
      .map((p) => p.local_id)

    await db.countQueue.bulkDelete(processedIds)

    // Mark errors
    for (const errItem of result.errors ?? []) {
      await db.countQueue.update(errItem.local_id, {
        status: 'error',
        last_error: errItem.error,
      })
    }
  } catch (err) {
    // Mark all as error — will retry next flush
    for (const item of pending) {
      await db.countQueue.update(item.local_id, {
        status: 'error',
        attempts: item.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function flushPhotoQueue(): Promise<void> {
  const pending = await db.photoQueue
    .where('status')
    .anyOf(['pending', 'error'])
    .and((item) => item.attempts < 3 && item.tipo === 'evidencia')
    .toArray()

  if (pending.length === 0) return

  const supabase = createClient()

  for (const item of pending) {
    await db.photoQueue.update(item.id, { status: 'processing' })

    try {
      const path = `${item.tenantId}/${item.sessionId ?? 'unknown'}/${item.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('evidence-photos')
        .upload(path, item.blob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      // Update the synced product_count with the storage path
      if (item.localCountId) {
        await supabase
          .from('product_counts')
          .update({ foto_evidencia_url: path })
          .eq('local_id', item.localCountId)
      }

      await db.photoQueue.delete(item.id)
    } catch (err) {
      await db.photoQueue.update(item.id, {
        status: 'error',
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function syncCatalog(tenantId: string): Promise<void> {
  const supabase = createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, tenant_id, nombre, unidad_medida, subtipo, requiere_fecha_vencimiento, embedding, updated_at')
    .eq('tenant_id', tenantId)
    .eq('estado', 'activo')

  if (error || !products) return

  // Bulk replace local catalog — clears stale entries first
  await db.products.where('tenant_id').equals(tenantId).delete()
  await db.products.bulkPut(
    products.map((p) => ({
      id: p.id as string,
      tenant_id: p.tenant_id as string,
      nombre: p.nombre as string,
      unidad_medida: p.unidad_medida as string,
      subtipo: p.subtipo as string,
      requiere_fecha_vencimiento: p.requiere_fecha_vencimiento as boolean,
      embedding: p.embedding as number[] | null,
      updated_at: p.updated_at as string,
    }))
  )
}

export async function flushAll(): Promise<void> {
  await Promise.allSettled([
    flushAudioQueue(),
    flushCountQueue(),
    flushPhotoQueue(),
  ])
}
