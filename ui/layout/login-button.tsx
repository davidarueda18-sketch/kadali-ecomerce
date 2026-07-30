'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, LogOut, Package, User } from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'
import { displayName } from '@/lib/format'

type Props = {
  className?: string
}

export default function LoginButton({ className = '' }: Props) {
  const { data: session, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const user = session?.user
  const name = user ? displayName(user) : ''

  if (isPending) {
    return <div className={`h-11 w-28 animate-pulse rounded-full bg-surface ${className}`} />
  }

  if (!user) {
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
