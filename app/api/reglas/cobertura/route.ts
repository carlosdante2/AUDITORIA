import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TIPOS_FASE1 } from '@/lib/reglas-engine'

// GET /api/reglas/cobertura
// Matriz categorías × tipos: qué (categoría, tipo) NO tiene regla específica ni global.
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (user.app_metadata?.rol !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const [{ data: cats }, { data: reglas }] = await Promise.all([
    supabase.from('categorias').select('id, nombre').order('nombre'),
    supabase.from('reglas').select('tipo, ambito, ambito_id').is('vigente_hasta', null).eq('activa', true),
  ])

  const categorias = cats ?? []
  const rs = reglas ?? []

  const globalPorTipo = new Set(rs.filter((r) => r.ambito === 'GLOBAL').map((r) => r.tipo))
  const catTipo = new Set(rs.filter((r) => r.ambito === 'CATEGORIA').map((r) => `${r.ambito_id}|${r.tipo}`))

  // Fila "Global" + una fila por categoría; celda cubierta si hay regla global del tipo o específica de la categoría
  const matriz = categorias.map((c) => ({
    categoria_id: c.id,
    categoria: c.nombre,
    tipos: TIPOS_FASE1.map((t) => ({
      tipo: t,
      cubierto: globalPorTipo.has(t) || catTipo.has(`${c.id}|${t}`),
      especifico: catTipo.has(`${c.id}|${t}`),
    })),
  }))

  const globalRow = TIPOS_FASE1.map((t) => ({ tipo: t, cubierto: globalPorTipo.has(t) }))

  return NextResponse.json({ tipos: TIPOS_FASE1, global: globalRow, matriz })
}
