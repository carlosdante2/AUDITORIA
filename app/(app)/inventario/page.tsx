import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { InventarioClient } from './InventarioClient'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Categoría (vía products) y ubicación real del equipo (vía equipos → sede/sección)
  // — antes el lote no mostraba ninguna de las dos, aunque ya se guardaban al crearlo.
  const { data: lotes } = await supabase
    .from('lotes')
    .select(`
      id, codigo_lote, cantidad, fecha_vencimiento, estado_cuarentena, created_at,
      products(nombre, unidad_medida, categorias(nombre)),
      equipos(codigo, ubicacion, sedes(nombre), secciones(nombre)),
      lote_estado(color, detalle, bloqueo_salida, bloqueo_ingreso, evaluado_en)
    `)
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(500)

  return <InventarioClient initialLotes={lotes ?? []} />
}
