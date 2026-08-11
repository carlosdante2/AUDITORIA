import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkFirst, StaleWhileRevalidate } from 'serwist'

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache app shell routes for offline use — auditors need capture + sessions offline
    {
      matcher: /^\/(captura|sesiones|recepcion|dashboard|admin)/,
      handler: new NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
      }),
    },
    // Cache Supabase Storage photos with stale-while-revalidate
    {
      matcher: /supabase\.co\/storage/,
      handler: new StaleWhileRevalidate({ cacheName: 'supabase-storage' }),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()
