import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nosotros | Kadali',
  description: 'Conoce la historia de Kadali.',
}

export default function NosotrosPage() {
  return (
    <section
      aria-labelledby="nosotros-title"
      className="mx-auto min-h-[70vh] max-w-7xl px-6 py-12 sm:px-8 lg:px-12"
    >
      <h1 id="nosotros-title" className="font-heading text-4xl font-semibold text-fg">
        Nosotros
      </h1>
    </section>
  )
}
