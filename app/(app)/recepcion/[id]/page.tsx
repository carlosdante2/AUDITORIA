import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

interface ReceptionItem {
  id: string
  descripcion_extraida: string
  cantidad: number | null
  precio_unitario: number | null
  match_score: number | null
  estado: string
  products: { nombre: string; unidad_medida: string } | null
}

const ITEM_ESTADO: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  confirmado: {
    label: 'Confirmado',
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    class: 'border-green-200',
  },
  corregido: {
    label: 'Corregido',
    icon: <CheckCircle className="w-4 h-4 text-blue-500" />,
    class: 'border-blue-200',
  },
  pendiente_aprobacion: {
    label: 'Pendiente aprobación',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    class: 'border-yellow-200 bg-yellow-50/40',
  },
}

export default async function RecepcionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: reception } = await supabase
    .from('receptions')
    .select('id, proveedor, foto_factura_url, estado, created_at, confirmed_at')
    .eq('id', id)
    .single()

  if (!reception) notFound()

  const { data: items } = await supabase
    .from('reception_items')
    .select('id, descripcion_extraida, cantidad, precio_unitario, match_score, estado, products ( nombre, unidad_medida )')
    .eq('reception_id', id)
    .order('created_at', { ascending: true })

  const typedItems = (items ?? []) as unknown as ReceptionItem[]

  // Signed URL for invoice photo (1h expiry)
  let invoicePhotoUrl: string | null = null
  if (reception.foto_factura_url) {
    const path = reception.foto_factura_url.split('/invoice-photos/')[1]
    if (path) {
      const { data: signed } = await supabase.storage
        .from('invoice-photos')
        .createSignedUrl(path, 3600)
      invoicePhotoUrl = signed?.signedUrl ?? null
    }
  }

  const confirmedCount = typedItems.filter((i) => i.estado !== 'pendiente_aprobacion').length
  const pendingCount   = typedItems.filter((i) => i.estado === 'pendiente_aprobacion').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/recepcion"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a recepciones
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {reception.proveedor ?? 'Proveedor desconocido'}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(reception.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
          {' · '}
          <span className={
            reception.estado === 'confirmada' ? 'text-green-600 font-medium'
            : reception.estado === 'con_pendientes' ? 'text-yellow-600 font-medium'
            : 'text-gray-500'
          }>
            {reception.estado === 'confirmada' ? 'Confirmada'
              : reception.estado === 'con_pendientes' ? 'Con pendientes'
              : 'Borrador'}
          </span>
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-green-700">{confirmedCount}</p>
          <p className="text-xs font-semibold text-green-600 mt-0.5">Identificados</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-700">{pendingCount}</p>
            <p className="text-xs font-semibold text-yellow-600 mt-0.5">Pendientes</p>
          </div>
        )}
      </div>

      {/* Invoice photo */}
      {invoicePhotoUrl && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Foto de factura</p>
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={invoicePhotoUrl}
              alt="Factura"
              className="w-full object-cover max-h-48"
            />
            <a
              href={invoicePhotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 flex items-center gap-1 text-xs bg-black/50 text-white px-2 py-1 rounded-lg hover:bg-black/70"
            >
              <ExternalLink className="w-3 h-3" />
              Ver completa
            </a>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {typedItems.length} ítem{typedItems.length !== 1 ? 's' : ''}
        </p>

        {typedItems.map((item) => {
          const cfg = ITEM_ESTADO[item.estado] ?? ITEM_ESTADO.confirmado
          return (
            <div key={item.id} className={`bg-white rounded-xl border p-4 space-y-2 ${cfg.class}`}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">Descripción extraída</p>
                  <p className="text-sm text-gray-700">{item.descripcion_extraida}</p>

                  {item.products && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-400">Producto del catálogo</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.products.nombre}
                        {item.match_score && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">
                            {Math.round(item.match_score * 100)}% coincidencia
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {item.cantidad != null && `${item.cantidad} `}
                    {item.products?.unidad_medida}
                    {item.precio_unitario != null && ` · $${item.precio_unitario.toLocaleString('es-CO')}`}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 ${
                  item.estado === 'confirmado' ? 'bg-green-100 text-green-700'
                  : item.estado === 'pendiente_aprobacion' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
                }`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
