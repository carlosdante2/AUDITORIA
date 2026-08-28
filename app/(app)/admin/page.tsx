import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Package, Upload, Clock, Users, ChevronRight, Building2, DollarSign, SlidersHorizontal, Bell, Refrigerator, FileText } from 'lucide-react'

const SECTIONS = [
  {
    href: '/admin/sedes',
    icon: <Building2 className="w-6 h-6 text-indigo-600" />,
    title: 'Sedes y secciones',
    desc: 'Configurar los almacenes/sedes y sus secciones (cámara fría, almacén seco…)',
    bg: 'bg-indigo-50 border-indigo-200',
  },
  {
    href: '/admin/catalogo',
    icon: <Package className="w-6 h-6 text-blue-600" />,
    title: 'Catálogo de productos',
    desc: 'Productos y categorías: editar, eliminar, categorizar, activar/desactivar y agrupar para reglas de semáforo',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    href: '/admin/equipos',
    icon: <Refrigerator className="w-6 h-6 text-cyan-600" />,
    title: 'Equipos de frío',
    desc: 'Cámaras y neveras donde se guardan los lotes (base de las reglas de temperatura)',
    bg: 'bg-cyan-50 border-cyan-200',
  },
  {
    href: '/admin/importar',
    icon: <Upload className="w-6 h-6 text-purple-600" />,
    title: 'Importar productos (CSV)',
    desc: 'Carga masiva de productos y generación de embeddings para búsqueda por voz',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    href: '/admin/pendientes',
    icon: <Clock className="w-6 h-6 text-orange-600" />,
    title: 'Productos pendientes',
    desc: 'Revisar y aprobar productos detectados por los auditores que no están en catálogo',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    href: '/admin/usuarios',
    icon: <Users className="w-6 h-6 text-green-600" />,
    title: 'Usuarios y accesos',
    desc: 'Invitar auditores y supervisores al sistema',
    bg: 'bg-green-50 border-green-200',
  },
  {
    href: '/admin/reglas',
    icon: <SlidersHorizontal className="w-6 h-6 text-rose-600" />,
    title: 'Reglas del semáforo',
    desc: 'Configurar umbrales (vencimiento, trazabilidad, cuarentena, stock) + simulador',
    bg: 'bg-rose-50 border-rose-200',
  },
  {
    href: '/alertas',
    icon: <Bell className="w-6 h-6 text-amber-600" />,
    title: 'Alertas',
    desc: 'Revisar, reconocer y cerrar los hallazgos del semáforo',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    href: '/reportes',
    icon: <FileText className="w-6 h-6 text-slate-600" />,
    title: 'Reportes HACCP',
    desc: 'Documento imprimible: temperaturas, no conformidades y cumplimiento por período',
    bg: 'bg-slate-50 border-slate-200',
  },
  {
    href: '/admin/costos',
    icon: <DollarSign className="w-6 h-6 text-emerald-600" />,
    title: 'Control de costos IA',
    desc: 'Gasto real y proyección de Groq y Jina, con alertas de plan gratuito',
    bg: 'bg-emerald-50 border-emerald-200',
  },
]

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

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-4 border rounded-2xl p-4 hover:opacity-80 transition-opacity ${s.bg}`}
          >
            <div className="shrink-0">{s.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm">{s.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
