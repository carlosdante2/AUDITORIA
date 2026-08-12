import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { evaluarYMaterializar } from '@/lib/reglas-evaluate'

// POST /api/lotes/:id/reevaluar → re-evalúa un lote y devuelve su estado
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string
  const estado = await evaluarYMaterializar(supabase, id, tenantId)
  if (!estado) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ estado })
}
