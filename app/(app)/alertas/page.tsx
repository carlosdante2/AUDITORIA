import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AlertasClient } from './AlertasClient'

export default async function AlertasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'supervisor' && rol !== 'admin') redirect('/dashboard')

  const { data: alertas } = await supabase
    .from('alertas')
    .select('id, color, mensaje, valor_evaluado, estado, creada_en, cerrada_en, regla_version, lotes(codigo_lote, products(nombre))')
    .order('creada_en', { ascending: false })
    .limit(500)

  return <AlertasClient initialAlertas={alertas ?? []} userId={user.id} />
}
