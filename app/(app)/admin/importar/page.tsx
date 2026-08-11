import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ImportarClient } from './ImportarClient'

export default async function ImportarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  const tenantId = user.app_metadata?.tenant_id as string

  return <ImportarClient tenantId={tenantId} />
}
