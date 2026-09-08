import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Package, Upload, Clock, Users, Building2, DollarSign, SlidersHorizontal, Bell, Refrigerator, FileText } from 'lucide-react'

// Secciones agrupadas por tema, cada grupo con un solo color de acento
// (antes cada tarjeta tenía su propio color — 10 tonos distintos leían como
// una lista sin orden). Dentro de cada grupo, primero lo que se usa a diario.
const GROUPS = [
  {
    label: 'Motor y monitoreo',
    accent: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    items: [
      { href: '/alertas', icon: Bell, title: 'Alertas', desc: 'Hallazgos del semáforo' },
      { href: '/admin/reglas', icon: SlidersHorizontal, title: 'Reglas del semáforo', desc: 'Umbrales configurables' },
      { href: '/reportes', icon: FileText, title: 'Reportes HACCP', desc: 'Documento imprimible' },
      { href: '/admin/costos', icon: DollarSign, title: 'Costos IA', desc: 'Gasto en Groq y Jina' },
    ],
  },
  {
    label: 'Catálogo',
    accent: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    items: [
      { href: '/admin/pendientes', icon: Clock, title: 'Pendientes', desc: 'Aprobar productos detectados' },
      { href: '/admin/catalogo', icon: Package, title: 'Catálogo', desc: 'Productos y categorías' },
      { href: '/admin/equipos', icon: Refrigerator, title: 'Equipos', desc: 'Cámaras y neveras' },
      { href: '/admin/importar', icon: Upload, title: 'Importar CSV', desc: 'Carga masiva' },
    ],
  },
  {
    label: 'Organización',
    accent: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600',
    items: [
      { href: '/admin/usuarios', icon: Users, title: 'Usuarios', desc: 'Invitar accesos' },
      { href: '/admin/sedes', icon: Building2, title: 'Sedes', desc: 'Almacenes y secciones' },
    ],
  },
] as const

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = user.app_metadata?.rol as string | undefined
  if (rol !== 'admin') redirect('/dashboard')

  const [{ count: productCount }, { count: pendingCount }, { count: userCount }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('pending_products').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión del sistema Fresko</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{productCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Productos activos</p>
        </div>
        <div className="bg-white border border-orange-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-600">{pendingCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Pendientes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-600">{userCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Usuarios</p>
        </div>
      </div>

      {/* Secciones agrupadas */}
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              {group.label}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1.5 text-center border rounded-2xl p-4 hover:opacity-80 transition-opacity ${group.accent}`}
                  >
                    <Icon className={`w-6 h-6 ${group.iconColor}`} />
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</p>
                    <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
