import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { CatalogoClient } from './CatalogoClient'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  const { data: products } = await supabase
    .from('products')
    .select('id, nombre, unidad_medida, subtipo, requiere_fecha_vencimiento, estado, updated_at')
    .order('nombre', { ascending: true })
    .limit(500)

  return <CatalogoClient initialProducts={products ?? []} />
}
