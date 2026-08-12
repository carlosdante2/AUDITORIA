'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CatalogSync } from '@/components/CatalogSync'
import {
  LayoutDashboard, Mic, ClipboardList, PackageCheck,
  Settings2, LogOut, Clock, Users, Building2, Boxes, Bell, Thermometer
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin',           label: 'Panel',      icon: <Settings2 className="w-5 h-5" /> },
    { href: '/admin/sedes',     label: 'Sedes',      icon: <Building2 className="w-5 h-5" /> },
    { href: '/admin/catalogo',  label: 'Catálogo',   icon: <PackageCheck className="w-5 h-5" /> },
    { href: '/admin/pendientes',label: 'Pendientes', icon: <ClipboardList className="w-5 h-5" /> },
    { href: '/admin/usuarios',  label: 'Usuarios',   icon: <Users className="w-5 h-5" /> },
  ],
  supervisor: [
    { href: '/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/inventario', label: 'Inventario', icon: <Boxes className="w-5 h-5" /> },
    { href: '/alertas',    label: 'Alertas',    icon: <Bell className="w-5 h-5" /> },
    { href: '/sesiones',   label: 'Sesiones',   icon: <ClipboardList className="w-5 h-5" /> },
    { href: '/recepcion',  label: 'Recepción',  icon: <PackageCheck className="w-5 h-5" /> },
  ],
  auditor: [
    { href: '/captura',     label: 'Captura',     icon: <Mic className="w-5 h-5" /> },
    { href: '/temperatura', label: 'Temp.',       icon: <Thermometer className="w-5 h-5" /> },
    { href: '/inventario',  label: 'Inventario',  icon: <Boxes className="w-5 h-5" /> },
    { href: '/sesiones',    label: 'Sesiones',    icon: <ClipboardList className="w-5 h-5" /> },
    { href: '/recepcion',   label: 'Recepción',   icon: <PackageCheck className="w-5 h-5" /> },
  ],
}

const ROL_COLOR: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  supervisor: 'bg-blue-100 text-blue-700',
  auditor:    'bg-green-100 text-green-700',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [rol, setRol] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const r = user.app_metadata?.rol as string | undefined
      const t = user.app_metadata?.tenant_id as string | undefined
      if (!r || !t) { router.replace('/login'); return }
      setRol(r)
      setTenantId(t)
      setReady(true)
    })
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const navItems = NAV[rol!] ?? []
  const rolColor = ROL_COLOR[rol!] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {tenantId && <CatalogSync tenantId={tenantId} />}

      {/* Top bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-gray-900 text-base">AuditorIA</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${rolColor}`}>
            {rol}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-3 px-2 text-[10px] font-semibold transition-colors min-w-0 flex-1 ${
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className={active ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
