import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { CapturaPageClient } from './components/CapturaPageClient'

export default async function CapturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string

  // Fetch open sessions + active sedes with their secciones (scoped by RLS)
  const [{ data: sessions }, { data: sedes }] = await Promise.all([
    supabase
      .from('audit_sessions')
      .select('id, bodega, estado, opened_at')
      .eq('estado', 'abierta')
      .order('opened_at', { ascending: false })
      .limit(20),
    supabase
      .from('sedes')
      .select('id, nombre, secciones(id, nombre, estado)')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
  ])

  return (
    <CapturaPageClient
      tenantId={tenantId}
      initialSessions={sessions ?? []}
      sedes={sedes ?? []}
    />
  )
}
