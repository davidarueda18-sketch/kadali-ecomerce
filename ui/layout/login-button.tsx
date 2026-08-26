'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, LogOut, Package, User } from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { displayName } from '@/lib/format'

type Props = {
  className?: string
  compact?: boolean
}

export default function LoginButton({ className = '', compact = false }: Props) {
  const { data: session, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const user = session?.user
  const name = user ? displayName(user) : ''

  if (isPending) {
    if (compact) {
      return (
        <div
          aria-hidden="true"
          className={`grid size-11 place-items-center rounded-full text-brand-deep ${className}`}
        >
          <User className="size-5" strokeWidth={1.75} />
        </div>
      )
    }

    return (
      <div
        className={`h-11 w-28 animate-pulse rounded-full bg-surface/60 ${className}`}
      />
    )
  }

  if (!user) {
    if (compact) {
      return (
        <Link
          href="/acceso"
          aria-label="Acceder a mi cuenta"
          className={`inline-flex size-11 items-center justify-center rounded-full text-brand-deep transition hover:bg-surface/70 ${className}`}
        >
          <User className="size-5" strokeWidth={1.75} />
        </Link>
      )
    }

    return (
      <Link
        href="/acceso"
        className={`inline-flex items-center gap-2.5 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-sm transition hover:shadow-md ${className}`}
      >
        <span className="text-sm font-semibold text-brand-deep">Regístrate</span>
        <span className="grid size-8 place-items-center rounded-full bg-brand-deep text-surface">
          <ArrowUpRight className="size-4" strokeWidth={1.75} />
        </span>
      </Link>
    )
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={name}
          className={`inline-grid size-11 place-items-center overflow-hidden rounded-full text-brand-deep transition hover:bg-surface/70 ${className}`}
        >
          {user.image ? (
            <Image src={user.image} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
          ) : (
            <User className="size-5" strokeWidth={1.75} />
          )}
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-surface py-1 shadow-lg">
              <Link
                href="/cuenta/pedidos"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-bg-alt"
              >
                <Package className="size-4" strokeWidth={1.75} />
                Mis pedidos
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-fg hover:bg-bg-alt"
              >
                <LogOut className="size-4" strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={name}
        className={`inline-flex items-center gap-2.5 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-sm transition hover:shadow-md ${className}`}
      >
        <span className="max-w-28 truncate text-sm font-semibold text-brand-deep">{name}</span>
        <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-bg-alt text-brand-deep">
          {user.image ? (
            <Image src={user.image} alt="" width={32} height={32} className="size-full object-cover" />
          ) : (
            <User className="size-4" strokeWidth={1.75} />
          )}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-surface py-1 shadow-lg">
            <Link
              href="/cuenta/pedidos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-bg-alt"
            >
              <Package className="size-4" strokeWidth={1.75} />
              Mis pedidos
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-fg hover:bg-bg-alt"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}
