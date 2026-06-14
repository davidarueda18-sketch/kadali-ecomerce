import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from './lib/cloudinary'
import { getActiveProducts, getCategories } from './lib/queries'

export const metadata: Metadata = {
  title: 'Kadali — Velas artesanales',
  description:
    'Descubre la colección de velas artesanales de Kadali. Aromas únicos, hechas con amor.',
}

const PILLARS = [
  { icon: '🌿', label: 'Cera de soya', desc: '100% natural y sostenible' },
  { icon: '✋', label: 'Hecho a mano', desc: 'Cada pieza es única' },
  { icon: '🌸', label: 'Aromas naturales', desc: 'Sin químicos artificiales' },
  { icon: '🇨🇴', label: 'Hecho en Colombia', desc: 'Envíos a todo el país' },
]

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getActiveProducts(),
    getCategories(),
  ])

  const featured = products.slice(0, 3)
  const heroImages = products.filter((p) => p.imagePublicId).slice(0, 3)

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center px-6 py-20 lg:px-16">
        {/* Decorative background blob */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 80% 50%, #F9D7DD 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
              Velas artesanales · Colombia
            </span>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold text-fg leading-[1.1]">
              Ilumina{' '}
              <span className="relative inline-block">
                cada
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 w-full h-1 rounded-full bg-brand opacity-30"
                />
              </span>
              <br />
              momento
            </h1>
            <p className="text-base text-fg-muted leading-relaxed max-w-sm">
              Velas hechas a mano con cera de soya y aromas naturales. Para los
              rincones que más quieres.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-strong text-surface px-6 py-3.5 text-sm font-semibold hover:bg-orchid-700 transition-colors"
              >
                Ver catálogo
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface text-fg px-6 py-3.5 text-sm font-semibold hover:border-brand transition-colors"
              >
                Explorar aromas →
              </Link>
            </div>
          </div>

          {/* Right: floating product images */}
          {heroImages.length > 0 && (
            <div className="relative h-[420px] lg:h-[520px] hidden sm:block">
              {heroImages[0] && (
                <div className="absolute top-0 right-0 w-56 h-64 lg:w-72 lg:h-80 rounded-3xl overflow-hidden shadow-lg">
                  <Image
                    src={cloudinaryUrl(heroImages[0].imagePublicId!, 600)}
                    alt={heroImages[0].name}
                    fill
                    sizes="288px"
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              {heroImages[1] && (
                <div className="absolute bottom-8 left-4 w-48 h-56 lg:w-60 lg:h-72 rounded-3xl overflow-hidden shadow-lg">
                  <Image
                    src={cloudinaryUrl(heroImages[1].imagePublicId!, 600)}
                    alt={heroImages[1].name}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                </div>
              )}
              {heroImages[2] && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 w-36 h-44 lg:w-44 lg:h-52 rounded-3xl overflow-hidden shadow-md border-4 border-bg">
                  <Image
                    src={cloudinaryUrl(heroImages[2].imagePublicId!, 400)}
                    alt={heroImages[2].name}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
              )}

              {/* Floating badge */}
              <div className="absolute bottom-20 right-4 bg-surface border border-line rounded-2xl px-4 py-3 shadow-sm text-xs font-medium text-fg">
                ✨ Hechas con amor
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PILLARES ─────────────────────────────────────────── */}
      <section className="border-y border-line bg-bg-alt">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((p) => (
            <div key={p.label} className="flex flex-col gap-1.5">
              <span className="text-2xl">{p.icon}</span>
              <p className="text-sm font-semibold text-fg">{p.label}</p>
              <p className="text-xs text-fg-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTOS DESTACADOS ─────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 lg:px-16 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-2">
                Selección
              </p>
              <h2 className="font-heading text-3xl font-semibold text-fg">
                Favoritos de la temporada
              </h2>
            </div>
            <Link
              href="/productos"
              className="text-sm text-fg-muted hover:text-fg transition-colors hidden sm:block"
            >
              Ver todos →
            </Link>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p, i) => (
              <li
                key={p.id}
                className={i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}
              >
                <Link href={`/productos/${p.slug}`} className="group block">
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-bg-alt mb-3 ${
                      i === 0 ? 'aspect-[16/9] lg:aspect-[4/5]' : 'aspect-[4/5]'
                    }`}
                  >
                    {p.imagePublicId ? (
                      <Image
                        src={cloudinaryUrl(p.imagePublicId, 700)}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-bg-alt" />
                    )}
                    {i === 0 && (
                      <span className="absolute top-4 left-4 bg-brand-strong text-surface text-xs font-semibold px-3 py-1 rounded-full">
                        Más vendido
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-fg group-hover:text-brand transition-colors mb-0.5">
                    {p.name}
                  </h3>
                  <p className="text-sm text-fg-muted">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                    }).format(Number(p.price))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 sm:hidden text-center">
            <Link
              href="/productos"
              className="text-sm text-fg-muted hover:text-fg transition-colors"
            >
              Ver todos los productos →
            </Link>
          </div>
        </section>
      )}

      {/* ── COLECCIONES ──────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 lg:px-16 pb-20">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-2">
              Colecciones
            </p>
            <h2 className="font-heading text-3xl font-semibold text-fg">
              Encuentra tu estilo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat, i) => {
              const catProduct = products.find(
                (p) => p.imagePublicId
              )
              const img = products
                .filter((p) => p.imagePublicId)
                [i % products.filter((p) => p.imagePublicId).length]

              return (
                <Link
                  key={cat.id}
                  href={`/productos?cat=${cat.slug}`}
                  className="group relative h-64 rounded-2xl overflow-hidden flex items-end p-6 bg-bg-alt"
                >
                  {img?.imagePublicId && (
                    <Image
                      src={cloudinaryUrl(img.imagePublicId, 700)}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-fg/70 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <h3 className="font-heading text-xl font-semibold text-surface mb-1">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-surface/80 font-medium">
                      Explorar →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── CTA FINAL ────────────────────────────────────────── */}
      <section className="bg-brand-strong text-surface">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-6">
          <span className="text-4xl">🕯️</span>
          <h2 className="font-heading text-4xl sm:text-5xl font-semibold leading-tight">
            Encuentra tu aroma favorito
          </h2>
          <p className="text-surface/70 text-base max-w-sm">
            Cada vela cuenta una historia. Descubre cuál es la tuya.
          </p>
          <Link
            href="/productos"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-surface text-brand-strong px-8 py-4 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Ver colección completa
          </Link>
        </div>
      </section>
    </div>
  )
}
