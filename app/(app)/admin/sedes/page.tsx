import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SedesClient } from './SedesClient'

export default async function SedesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  const tenantId = user.app_metadata?.tenant_id as string

  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre, direccion, estado, secciones(id, nombre, estado)')
    .order('nombre', { ascending: true })

  return <SedesClient initialSedes={sedes ?? []} tenantId={tenantId} />
}
