import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { NuevaRecepcionClient } from './NuevaRecepcionClient'

export default async function NuevaRecepcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string

  return (
    <NuevaRecepcionClient
      tenantId={tenantId}
      auditorId={user.id}
    />
  )
}
