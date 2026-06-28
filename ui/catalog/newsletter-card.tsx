'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export default function NewsletterCard() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
    // TODO: connect to email backend/service
  }

  return (
    <div className="rounded-3xl bg-surface border border-line p-6 flex flex-col justify-between min-h-[200px] lg:min-h-0">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Obtén un Bono
        </p>
        <span className="rounded-full border border-line p-1.5 text-fg-muted">
          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </span>
      </div>

      <h3 className="font-heading text-xl font-semibold text-fg mb-1 flex-1">
        Descubre nuestras{' '}
        <span className="text-brand">novedades</span> exclusivas.
      </h3>

      {submitted ? (
        <p className="mt-4 rounded-xl bg-matcha-200 px-4 py-3 text-sm font-medium text-fg">
          ¡Gracias! Te avisaremos pronto.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-surface hover:bg-orchid-700 transition-colors"
          >
            Suscribirse
          </button>
        </form>
      )}
    </div>
  )
}
