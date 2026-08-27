import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { CatalogoTabs } from './CatalogoTabs'

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  const tenantId = user.app_metadata?.tenant_id as string

  const [{ data: products }, { count: missingEmbeddings }, { data: categorias }] = await Promise.all([
    supabase
      .from('products')
      .select('id, nombre, unidad_medida, subtipo, requiere_fecha_vencimiento, estado, updated_at, categoria_id')
      .order('nombre', { ascending: true })
      .limit(500),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null)
      .eq('estado', 'activo'),
    supabase
      .from('categorias')
      .select('id, nombre, parent_id')
      .order('nombre', { ascending: true }),
  ])

  return (
    <Suspense>
      <CatalogoTabs
        products={products ?? []}
        missingEmbeddings={missingEmbeddings ?? 0}
        categorias={categorias ?? []}
        tenantId={tenantId}
      />
    </Suspense>
  )
}
