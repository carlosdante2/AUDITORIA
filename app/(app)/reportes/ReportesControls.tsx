'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Printer, Calendar } from 'lucide-react'

export function ReportesControls({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [d, setD] = useState(desde)
  const [h, setH] = useState(hasta)

  function aplicar() {
    const p = new URLSearchParams(params.toString())
    p.set('desde', d); p.set('hasta', h)
    router.push(`/reportes?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-2 print:hidden">
      <label className="text-xs font-semibold text-gray-600">
        Desde
        <input type="date" value={d} onChange={(e) => setD(e.target.value)}
          className="block h-10 rounded-lg border border-gray-300 px-2 text-sm mt-1" />
      </label>
      <label className="text-xs font-semibold text-gray-600">
        Hasta
        <input type="date" value={h} onChange={(e) => setH(e.target.value)}
          className="block h-10 rounded-lg border border-gray-300 px-2 text-sm mt-1" />
      </label>
      <button onClick={aplicar} className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-bold inline-flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />Aplicar
      </button>
      <button onClick={() => window.print()} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1.5 ml-auto">
        <Printer className="w-4 h-4" />Imprimir / PDF
      </button>
    </div>
  )
}
