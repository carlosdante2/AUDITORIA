import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ReglasClient } from './ReglasClient'

export default async function ReglasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.rol !== 'admin') redirect('/dashboard')

  const [{ data: reglas }, { data: categorias }, { data: productos }] = await Promise.all([
    supabase
      .from('reglas')
      .select('id, tipo, ambito, ambito_id, nombre, version, regla_umbrales(color, operador, valor_min, valor_max, valor_text, unidad, accion, mensaje, orden)')
      .is('vigente_hasta', null).eq('activa', true).order('tipo'),
    supabase.from('categorias').select('id, nombre').order('nombre'),
    supabase.from('products').select('id, nombre').eq('estado', 'activo').order('nombre').limit(500),
  ])

  return (
    <ReglasClient
      initialReglas={reglas ?? []}
      categorias={categorias ?? []}
      productos={productos ?? []}
    />
  )
}
