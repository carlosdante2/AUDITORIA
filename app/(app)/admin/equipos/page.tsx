import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { EquiposClient } from './EquiposClient'

export default async function EquiposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.rol !== 'admin') redirect('/dashboard')

  const tenantId = user.app_metadata?.tenant_id as string

  const [{ data: equipos }, { data: sedes }] = await Promise.all([
    supabase
      .from('equipos')
      .select('id, codigo, tipo, ubicacion, activo, sede_id, seccion_id, sedes(nombre), secciones(nombre)')
      .order('codigo', { ascending: true }),
    supabase
      .from('sedes')
      .select('id, nombre, secciones(id, nombre, estado)')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
  ])

  return <EquiposClient initialEquipos={equipos ?? []} sedes={sedes ?? []} tenantId={tenantId} />
}
