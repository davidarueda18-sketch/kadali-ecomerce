'use client'

import { useState } from 'react'

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p role="status" className="font-bold text-[#442a36]">
        ¡Listo! Te guardamos un lugar en la mesa.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="newsletter-email" className="sr-only">
        Tu correo electrónico
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="TU CORREO AQUÍ"
        required
      />
      <button type="submit">Me apunto</button>
    </form>
  )
}
