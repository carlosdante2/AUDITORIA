import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { evaluarYMaterializar } from '@/lib/reglas-evaluate'

// Cron horario: re-evalúa todos los lotes activos de todos los tenants para que
// VENCIMIENTO y LECTURA_VENCIDA avancen solos sin que nadie abra la app.
// Corre con service-role (sin RLS); evaluarYMaterializar filtra reglas por tenant.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  // Protección: si CRON_SECRET está configurado, exigir el header que envía Vercel Cron.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'MISSING_SERVICE_ROLE' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: lotes, error } = await supabase
    .from('lotes')
    .select('id, tenant_id')
    .eq('activo', true)
    .limit(20000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let reevaluados = 0
  let errores = 0
  for (const l of lotes ?? []) {
    try {
      await evaluarYMaterializar(supabase, l.id as string, l.tenant_id as string)
      reevaluados++
    } catch {
      errores++
    }
  }

  return NextResponse.json({ ok: true, lotes: (lotes ?? []).length, reevaluados, errores, at: new Date().toISOString() })
}
