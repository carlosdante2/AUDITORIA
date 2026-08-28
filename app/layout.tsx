import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { FlushOnMount } from '@/components/FlushOnMount'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fresko',
  description: 'Auditoría de inventario con semáforo sanitario para hotelería',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fresko',
  },
}

export const viewport: Viewport = {
  themeColor: '#26332C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <FlushOnMount />
        {children}
      </body>
    </html>
  )
}
