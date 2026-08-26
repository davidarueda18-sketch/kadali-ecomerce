import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenText,
  FileText,
  HeartHandshake,
  LogIn,
  Package,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { displayName } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Más | Kadali',
  description: 'Tu cuenta y la información de Kadali en un solo lugar.',
}

const INFORMATION_LINKS = [
  {
    label: 'Nosotros',
    description: 'Conoce la historia detrás de Kadali.',
    href: '/nosotros',
    icon: HeartHandshake,
  },
  {
    label: 'Términos y condiciones',
    description: 'Condiciones de uso y compra.',
    href: '/legal/terminos',
    icon: FileText,
  },
  {
    label: 'Política de privacidad',
    description: 'Cómo cuidamos tus datos.',
    href: '/legal/privacidad',
    icon: ShieldCheck,
  },
  {
    label: 'Cambios y devoluciones',
    description: 'Consulta nuestras políticas.',
    href: '/legal/devoluciones',
    icon: RotateCcw,
  },
] as const

export default async function MasPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user

  return (
    <div className="mx-auto min-h-[70vh] max-w-2xl px-5 pb-16 pt-8 sm:px-8 md:pb-12 md:pt-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Menú</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold text-fg">Más</h1>
      </header>

      <section aria-labelledby="cuenta-title" className="mt-8">
        <h2 id="cuenta-title" className="text-xs font-bold uppercase tracking-[0.16em] text-fg-muted">
          Mi cuenta
        </h2>

        {user ? (
          <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <div className="flex items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-petal-100 text-brand-deep">
                <UserRound className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-heading text-lg font-semibold text-fg">
                  {displayName(user)}
                </p>
                <p className="truncate text-sm text-fg-muted">{user.email}</p>
              </div>
            </div>
            <Link
              href="/cuenta/pedidos"
              className="flex items-center gap-3 border-t border-line px-5 py-4 text-sm font-bold text-brand-deep transition hover:bg-bg-alt"
            >
              <Package className="size-5" aria-hidden />
              Mis pedidos
              <ArrowRight className="ml-auto size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <Link
            href="/acceso?next=/mas"
            className="mt-3 flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:border-petal-300 hover:shadow-md"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-petal-100 text-brand-deep">
              <LogIn className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-heading text-lg font-semibold text-fg">Accede a tu cuenta</span>
              <span className="mt-0.5 block text-sm text-fg-muted">Consulta tus pedidos y datos de compra.</span>
            </span>
            <ArrowRight className="ml-auto size-4 shrink-0 text-brand-deep" aria-hidden />
          </Link>
        )}
      </section>

      <section aria-labelledby="informacion-title" className="mt-9">
        <h2 id="informacion-title" className="text-xs font-bold uppercase tracking-[0.16em] text-fg-muted">
          Información
        </h2>
        <nav aria-label="Información de Kadali" className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          {INFORMATION_LINKS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 transition hover:bg-bg-alt ${
                index > 0 ? 'border-t border-line' : ''
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg-alt text-brand-deep">
                <item.icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-fg">{item.label}</span>
                <span className="mt-0.5 block text-xs text-fg-muted">{item.description}</span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-fg-muted" aria-hidden />
            </Link>
          ))}
        </nav>
      </section>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-fg-muted">
        <BookOpenText className="size-4" aria-hidden />
        Todo lo importante, en un solo lugar.
      </p>
    </div>
  )
}
