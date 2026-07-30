'use client'

import { usePathname } from 'next/navigation'
import Nav from '@/ui/layout/nav'
import BottomNav from '@/ui/layout/bottom-nav'

// Rutas que se muestran a pantalla completa, sin el nav ni el bottom nav generales
const NO_CHROME_ROUTES = ['/acceso']

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideChrome = NO_CHROME_ROUTES.includes(pathname)

  if (hideChrome) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <>
      <Nav />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <BottomNav />
    </>
  )
}
