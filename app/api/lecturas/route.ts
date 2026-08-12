import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { reevaluarEquipo } from '@/lib/reglas-evaluate'

// POST /api/lecturas  → registra una lectura de temperatura (hora servidor) y
// re-evalúa los lotes del equipo. Body: { equipo_id, valor_c, evidencia_url?, evidencia_hash? }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string
  const body = await request.json().catch(() => null)
  const valor = typeof body?.valor_c === 'number' ? body.valor_c : Number(body?.valor_c)
  if (!body?.equipo_id || Number.isNaN(valor)) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })

  const { data: lectura, error: insErr } = await supabase
    .from('lecturas_temperatura')
    .insert({
      tenant_id: tenantId,
      equipo_id: body.equipo_id,
      valor_c: valor,
      usuario_id: user.id,
      evidencia_url: body.evidencia_url ?? null,
      evidencia_hash: body.evidencia_hash ?? null,
      // registrado_en lo pone el servidor (default now())
    })
    .select('id, registrado_en')
    .single()

  if (insErr || !lectura) return NextResponse.json({ error: insErr?.message ?? 'INSERT_FAILED' }, { status: 500 })

  const reevaluados = await reevaluarEquipo(supabase, body.equipo_id, tenantId)
  return NextResponse.json({ id: lectura.id, registrado_en: lectura.registrado_en, lotes_reevaluados: reevaluados }, { status: 201 })
}
