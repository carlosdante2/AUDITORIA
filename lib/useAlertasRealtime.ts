'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

// Notificación instantánea de alertas del semáforo (cualquier dimensión:
// vencimiento, trazabilidad, cuarentena, temperatura…) vía Supabase Realtime.
// Requiere que la tabla `alertas` esté en la publicación `supabase_realtime`
// (migración 018). Solo se monta para supervisor/admin — ver app/(app)/layout.tsx.

export interface AlertaToastData {
  id: string
  color: string
  mensaje: string
  equipoCodigo: string | null
  productoNombre: string | null
}

interface AlertaRow {
  id: string
  lote_id: string | null
  color: string
  mensaje: string
  estado: string
}

export function useAlertasRealtime(tenantId: string | null, enabled: boolean) {
  const [count, setCount] = useState(0)
  const [toast, setToast] = useState<AlertaToastData | null>(null)
  // Ids de alertas ABIERTA ya contadas — evita depender de REPLICA IDENTITY
  // FULL para saber el estado anterior en un UPDATE: si el id estaba en el
  // set y ahora no es ABIERTA, alguien la reconoció/cerró (en cualquier sesión).
  const abiertasRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !tenantId) return
    const supabase = createClient()
    let cancelled = false

    supabase
      .from('alertas')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('estado', 'ABIERTA')
      .then(({ data }) => {
        if (cancelled || !data) return
        abiertasRef.current = new Set(data.map((a) => a.id as string))
        setCount(abiertasRef.current.size)
      })

    const channel = supabase
      .channel(`alertas-tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas', filter: `tenant_id=eq.${tenantId}` },
        async (payload) => {
          const row = payload.new as AlertaRow
          if (row.estado !== 'ABIERTA' || abiertasRef.current.has(row.id)) return
          abiertasRef.current.add(row.id)
          setCount(abiertasRef.current.size)

          let equipoCodigo: string | null = null
          let productoNombre: string | null = null
          if (row.lote_id) {
            const { data } = await supabase
              .from('lotes')
              .select('products(nombre), equipos(codigo)')
              .eq('id', row.lote_id)
              .maybeSingle()
            const d = data as {
              products?: { nombre: string } | { nombre: string }[] | null
              equipos?: { codigo: string } | { codigo: string }[] | null
            } | null
            const prod = d?.products
            const eq = d?.equipos
            productoNombre = (Array.isArray(prod) ? prod[0]?.nombre : prod?.nombre) ?? null
            equipoCodigo = (Array.isArray(eq) ? eq[0]?.codigo : eq?.codigo) ?? null
          }
          if (!cancelled) setToast({ id: row.id, color: row.color, mensaje: row.mensaje, equipoCodigo, productoNombre })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alertas', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const row = payload.new as AlertaRow
          if (row.estado !== 'ABIERTA' && abiertasRef.current.has(row.id)) {
            abiertasRef.current.delete(row.id)
            setCount(abiertasRef.current.size)
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tenantId, enabled])

  return { count, toast, dismissToast: () => setToast(null) }
}
