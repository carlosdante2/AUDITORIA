'use client'

import { useEffect } from 'react'
import { syncCatalog, syncReglas } from '@/lib/sync'

interface CatalogSyncProps {
  tenantId: string
}

// Syncs the product catalog + reglas del semáforo to IndexedDB once per login.
// Ambos alimentan la evaluación offline (§5.2.5). Corre en background — nunca bloquea la UI.
export function CatalogSync({ tenantId }: CatalogSyncProps) {
  useEffect(() => {
    syncCatalog(tenantId).catch(() => {
      // Offline at login — catalog will sync when connectivity returns
    })
    syncReglas(tenantId).catch(() => {
      // Offline: se conserva la copia previa de reglas
    })
  }, [tenantId])

  return null
}
