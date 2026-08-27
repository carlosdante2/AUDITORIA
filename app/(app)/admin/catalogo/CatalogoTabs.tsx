'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Package, FolderTree } from 'lucide-react'
import { CatalogoClient } from './CatalogoClient'
import { CategoriasClient } from '../categorias/CategoriasClient'

interface Product {
  id: string
  nombre: string
  unidad_medida: string
  subtipo: string
  requiere_fecha_vencimiento: boolean
  estado: string
  updated_at: string
  categoria_id: string | null
}

interface Categoria { id: string; nombre: string; parent_id: string | null }

interface Props {
  products: Product[]
  missingEmbeddings: number
  categorias: Categoria[]
  tenantId: string
}

const TABS = [
  { key: 'productos',  label: 'Productos',  icon: Package },
  { key: 'categorias', label: 'Categorías', icon: FolderTree },
] as const

export function CatalogoTabs({ products, missingEmbeddings, categorias, tenantId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = searchParams.get('tab') === 'categorias' ? 'categorias' : 'productos'

  function setTab(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'productos') params.delete('tab')
    else params.set('tab', key)
    const qs = params.toString()
    // replace (no history spam) pero enlazable/persistente en la URL
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'productos' ? (
        <CatalogoClient
          initialProducts={products}
          missingEmbeddings={missingEmbeddings}
          categorias={categorias}
        />
      ) : (
        <CategoriasClient initialCategorias={categorias} tenantId={tenantId} />
      )}
    </div>
  )
}
