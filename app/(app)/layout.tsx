'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CatalogSync } from '@/components/CatalogSync'
import { LayoutDashboard, Mic, ClipboardList, PackageCheck, Settings, LogOut, ChevronDown } from 'lucide-react'

const NAV: Record<string, { href: string; label: string; icon: React.ReactNode }[]> = {
  admin: [
    { href: '/dashboard',       label: 'Dashboard',  icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/captura',         label: 'Captura',    icon: <Mic className="w-4 h-4" /> },
    { href: '/sesiones',        label: 'Sesiones',   icon: <ClipboardList className="w-4 h-4" /> },
    { href: '/recepcion',       label: 'Recepción',  icon: <PackageCheck className="w-4 h-4" /> },
    { href: '/admin/catalogo',  label: 'Config',     icon: <Settings className="w-4 h-4" /> },
  ],
  supervisor: [
    { href: '/dashboard',  label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/sesiones',   label: 'Sesiones',  icon: <ClipboardList className="w-4 h-4" /> },
    { href: '/recepcion',  label: 'Recepción', icon: <PackageCheck className="w-4 h-4" /> },
  ],
  auditor: [
    { href: '/captura',    label: 'Captura',   icon: <Mic className="w-4 h-4" /> },
    { href: '/sesiones',   label: 'Sesiones',  icon: <ClipboardList className="w-4 h-4" /> },
    { href: '/recepcion',  label: 'Recepción', icon: <PackageCheck className="w-4 h-4" /> },
  ],
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {tenantId && <CatalogSync tenantId={tenantId} />}

      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-gray-900">AuditorIA</span>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full capitalize">{rol}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-2xl mx-auto w-full px-4 py-6 flex-1">
        {children}
      </main>

      {/* Bottom tab nav */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-10">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-3 px-3 text-[10px] font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
