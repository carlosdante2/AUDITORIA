import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { TemperaturaClient } from './TemperaturaClient'

export default async function TemperaturaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Últimas 10 lecturas por equipo (historial), con quién y cuándo la registró,
  // más la ubicación real (sede · sección) en vez de un texto libre desconectado.
  const [{ data: equipos }, { data: perfil }] = await Promise.all([
    supabase
      .from('equipos')
      .select(`
        id, codigo, tipo, ubicacion, sede_id, seccion_id,
        sedes(nombre), secciones(nombre),
        lecturas_temperatura(valor_c, registrado_en, usuario_id, profiles(nombre))
      `)
      .eq('activo', true)
      .order('codigo', { ascending: true })
      .order('registrado_en', { ascending: false, referencedTable: 'lecturas_temperatura' })
      .limit(10, { referencedTable: 'lecturas_temperatura' }),
    supabase.from('profiles').select('nombre').eq('id', user.id).single(),
  ])

  return <TemperaturaClient initialEquipos={equipos ?? []} currentUserName={perfil?.nombre ?? 'Tú'} />
}
