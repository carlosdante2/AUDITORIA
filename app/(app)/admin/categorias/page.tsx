import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { CategoriasClient } from './CategoriasClient'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.rol !== 'admin') redirect('/dashboard')

  const tenantId = user.app_metadata?.tenant_id as string
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, parent_id')
    .order('nombre', { ascending: true })

  return <CategoriasClient initialCategorias={categorias ?? []} tenantId={tenantId} />
}
