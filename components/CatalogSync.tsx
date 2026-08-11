'use client'

import { useEffect } from 'react'
import { syncCatalog } from '@/lib/sync'

interface CatalogSyncProps {
  tenantId: string
}

// Syncs the product catalog to IndexedDB once per login session.
// Runs silently in the background — never blocks the UI.
export function CatalogSync({ tenantId }: CatalogSyncProps) {
  useEffect(() => {
    syncCatalog(tenantId).catch(() => {
      // Offline at login — catalog will sync when connectivity returns
    })
  }, [tenantId])

  return null
}
