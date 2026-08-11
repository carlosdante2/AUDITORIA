import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { UsuariosClient } from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  // Fetch current tenant users via profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nombre, created_at')
    .order('created_at', { ascending: false })

  return <UsuariosClient initialProfiles={profiles ?? []} />
}
