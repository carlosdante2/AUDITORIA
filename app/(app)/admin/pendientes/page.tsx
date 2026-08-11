import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { PendientesClient } from './PendientesClient'

export default async function PendientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin' && rol !== 'supervisor') redirect('/dashboard')

  const { data: pending } = await supabase
    .from('pending_products')
    .select('id, nombre_sugerido, unidad_sugerida, subtipo_sugerido, origen, match_candidates, created_at')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  return <PendientesClient initialPending={pending ?? []} userId={user.id} />
}
