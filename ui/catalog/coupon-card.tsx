'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export default function CouponCard() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
    // TODO: connect to email backend/service
  }

  return (
    <div className="flex min-h-55 flex-col justify-between rounded-3xl border border-line bg-surface p-5 lg:h-full lg:min-h-0">
      <div className="mb-2 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Gana cupones
        </p>
        <span className="rounded-full border border-line p-1.5 text-fg-muted">
          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </span>
      </div>

      <h3 className="font-heading text-lg font-semibold leading-snug text-fg line-clamp-3">
        Te regalamos un <span className="text-brand">15% de descuento</span> si te registras hoy.
      </h3>

      {submitted ? (
        <p className="mt-3 rounded-xl bg-matcha-200 px-4 py-2.5 text-sm font-medium text-fg">
          ¡Gracias! Revisa tu correo.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-line bg-bg px-3.5 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-fg px-3.5 py-2 text-sm font-semibold text-surface hover:bg-orchid-700 transition-colors"
          >
            Suscribirse
          </button>
        </form>
      )}
    </div>
  )
}
