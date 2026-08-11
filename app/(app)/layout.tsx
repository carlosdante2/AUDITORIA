import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { CatalogSync } from '@/components/CatalogSync'

// Protected layout — verifies auth and extracts tenant context.
// tenant_id and rol come from app_metadata (Constitution III).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  const rol = user.app_metadata?.rol as string | undefined

  if (!tenantId || !rol) {
    // Account exists but hasn't been fully provisioned yet
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cuenta en configuración</h2>
          <p className="text-sm text-gray-500 mt-2">
            Tu cuenta está siendo configurada por el administrador. Intenta de nuevo en unos minutos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CatalogSync tenantId={tenantId} />
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">AuditorIA</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 capitalize">{rol}</span>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
