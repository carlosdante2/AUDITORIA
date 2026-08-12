import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cargarReglasActivas } from '@/lib/reglas-data'

// GET /api/reglas/sync → snapshot para evaluar el semáforo offline en el cliente (§5.2.5).
// Devuelve las reglas vigentes en la forma del motor + tipos activos + el árbol de
// categorías (id, parent_id) para reconstruir la cadena de especificidad sin red.
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'NO_TENANT' }, { status: 400 })

  // RLS ya limita al tenant; pasamos tenantId igual para ser explícitos.
  const [{ reglas, tiposActivos }, { data: cats }] = await Promise.all([
    cargarReglasActivas(supabase, tenantId),
    supabase.from('categorias').select('id, parent_id').eq('tenant_id', tenantId),
  ])

  const categorias = (cats ?? []).map((c) => ({
    id: c.id as string,
    parent_id: (c.parent_id as string | null) ?? null,
  }))

  return NextResponse.json({
    reglas,
    tiposActivos,
    categorias,
    updated_at: new Date().toISOString(),
  })
}
