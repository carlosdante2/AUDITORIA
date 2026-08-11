import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { CapturaPageClient } from './components/CapturaPageClient'

export default async function CapturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string

  // Fetch open sessions for this tenant (scoped by RLS)
  const { data: sessions } = await supabase
    .from('audit_sessions')
    .select('id, bodega, estado, opened_at')
    .eq('estado', 'abierta')
    .order('opened_at', { ascending: false })
    .limit(20)

  return (
    <CapturaPageClient
      tenantId={tenantId}
      initialSessions={sessions ?? []}
    />
  )
}
