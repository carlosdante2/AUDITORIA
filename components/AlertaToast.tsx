'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import type { AlertaToastData } from '@/lib/useAlertasRealtime'

const COLOR_CLS: Record<string, string> = {
  AMARILLO: 'bg-yellow-500',
  NARANJA: 'bg-orange-500',
  ROJO: 'bg-red-600',
}

export function AlertaToast({ toast, onDismiss }: { toast: AlertaToastData; onDismiss: () => void }) {
  // Se auto-oculta; el badge de Alertas sigue reflejando el conteo real.
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const titulo = [toast.color, toast.equipoCodigo, toast.productoNombre].filter(Boolean).join(' · ')

  return (
    <div className="fixed top-3 left-3 right-3 z-50 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-2 print:hidden">
      <Link
        href="/alertas"
        onClick={onDismiss}
        className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-lg ${COLOR_CLS[toast.color] ?? 'bg-gray-700'}`}
      >
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{titulo}</p>
          <p className="text-xs opacity-90 line-clamp-2">{toast.mensaje}</p>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss() }}
          className="shrink-0 p-1 -m-1 opacity-80 hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </Link>
    </div>
  )
}
