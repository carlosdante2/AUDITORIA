import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { TemperaturaClient } from './TemperaturaClient'

export default async function TemperaturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: equipos } = await supabase
    .from('equipos')
    .select('id, codigo, tipo, ubicacion, lecturas_temperatura(valor_c, registrado_en)')
    .eq('activo', true)
    .order('codigo', { ascending: true })

  // última lectura por equipo (la relación viene sin orden garantizado → la resolvemos en cliente)
  return <TemperaturaClient initialEquipos={equipos ?? []} />
}
