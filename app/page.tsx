import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Clock3, Heart, Leaf, MapPin } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { formatPrice } from '@/lib/format'
import { getActiveProducts, getCategories } from '@/lib/db/queries'
import styles from './home.module.css'

export const metadata: Metadata = {
  title: 'Kadali — Velas artesanales que se ven deliciosas',
  description:
    'Descubre velas artesanales inspiradas en postres y frutas. Hechas en Colombia con cera de soya y mucho detalle.',
}

const PRODUCT_NOTES: Record<
  string,
  { label: string; note: string; accent: string }
> = {
  limalaya: {
    label: 'Cítrica',
    note: 'Lima · fresca y brillante',
    accent: 'bg-[#dfe8a7]',
  },
  'vida-fresastica': {
    label: 'Frutal',
    note: 'Fresa · dulce y vibrante',
    accent: 'bg-[#f4c0bd]',
  },
  'sand-ia': {
    label: 'Refrescante',
    note: 'Sandía · jugosa y alegre',
    accent: 'bg-[#cbdc9a]',
  },
  'mera-mora': {
    label: 'Intensa',
    note: 'Mora · suave y envolvente',
    accent: 'bg-[#d9b9ce]',
  },
}

const BENEFITS = [
  { icon: Leaf, label: 'Cera de soya', detail: 'Una combustión más limpia' },
  { icon: Heart, label: 'Hechas a mano', detail: 'Cada detalle es único' },
  { icon: Clock3, label: 'Hasta 84 horas', detail: 'Para disfrutar sin prisa' },
  { icon: MapPin, label: 'Hechas en Colombia', detail: 'Diseño y producción local' },
]

function productNote(slug: string) {
  return (
    PRODUCT_NOTES[slug] ?? {
      label: 'Artesanal',
      note: 'Un aroma para disfrutar',
      accent: 'bg-petal-100',
    }
  )
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getActiveProducts(),
    getCategories(),
  ])

  const collection = products.slice(0, 4)
  const heroProduct =
    collection.find((product) => product.slug === 'vida-fresastica') ?? collection[0]
  const heroCompanions = collection.filter((product) => product.id !== heroProduct?.id)
  const storyPrimary =
    collection.find((product) => product.slug === 'sand-ia') ?? collection[0]
  const storySecondary =
    collection.find((product) => product.slug === 'mera-mora') ?? collection[1]
  const collectionHref = categories[0]
    ? `/productos?cat=${categories[0].slug}`
    : '/productos'

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroHalo} aria-hidden />
        <div className="relative z-10 mx-auto grid min-h-svh max-w-7xl items-center gap-x-12 gap-y-10 px-5 pb-12 pt-28 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:grid-rows-[auto_auto] lg:gap-x-16 lg:gap-y-0 lg:px-12 lg:pb-16 lg:pt-28">
          <div className="max-w-2xl lg:col-start-1 lg:row-start-1 lg:self-end">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d9c7ba] bg-white/55 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.19em] text-[#694b50] backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              Velas artesanales · Colombia
            </div>

            <h1 className="font-heading text-[clamp(3.65rem,8vw,7.4rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-[#3c2830]">
              Enciende
              <span className="block text-brand">el antojo.</span>
            </h1>
          </div>

          {heroProduct && (
            <div className="relative mx-auto mb-4 w-full max-w-[680px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mb-0 lg:self-center">
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:gap-4">
                <Link
                  href={`/productos/${heroProduct.slug}`}
                  aria-label={`Ver ${heroProduct.name}`}
                  className={`${styles.heroPrimary} group relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#ead7c4] shadow-[0_28px_70px_rgba(87,53,38,0.20)] sm:rounded-[2.75rem]`}
                >
                  <Image
                    src={cloudinaryUrl(heroProduct.imagePublicId, 1000)}
                    alt={heroProduct.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 75vw, 42vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                        Aroma destacado
                      </span>
                      <h2 className="mt-1 font-heading text-2xl font-semibold sm:text-3xl">
                        {heroProduct.name}
                      </h2>
                    </div>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15 backdrop-blur-md transition group-hover:bg-white group-hover:text-[#442a36]">
                      <ArrowRight aria-hidden className="size-4" />
                    </span>
                  </div>
                </Link>

                <div className="grid grid-rows-3 gap-3 sm:gap-4">
                  {heroCompanions.slice(0, 3).map((product, index) => (
                    <Link
                      key={product.id}
                      href={`/productos/${product.slug}`}
                      aria-label={`Ver ${product.name}`}
                      className={`${styles.heroThumb} group relative overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_35px_rgba(87,53,38,0.14)] sm:rounded-[1.75rem]`}
                      style={{ animationDelay: `${index * 180}ms` }}
                    >
                      <Image
                        src={cloudinaryUrl(product.imagePublicId, 360)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 76px, 120px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
                      <span className="absolute bottom-2 left-1/2 size-2 -translate-x-1/2 rounded-full bg-white shadow sm:bottom-3" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="absolute -left-4 top-10 hidden -rotate-6 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-bold text-[#593a45] shadow-lg backdrop-blur-md sm:block lg:-left-12">
                Se ven deliciosas ✦
              </div>
              <div className="absolute -bottom-5 right-16 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-xl backdrop-blur-md sm:right-24 sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a7770]">
                  Desde
                </p>
                <p className="font-heading text-lg font-semibold text-[#3c2830]">
                  {formatPrice(heroProduct.price)}
                </p>
              </div>
            </div>
          )}

          <div className="max-w-2xl lg:col-start-1 lg:row-start-2 lg:self-start">
            <p className="max-w-lg text-base leading-7 text-[#6f615c] sm:text-lg sm:leading-8 lg:mt-8">
              Parecen postres, pero iluminan tus espacios. Velas de soya hechas a
              mano para llenar la casa de color, aroma y pequeños momentos felices.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/productos"
                className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[#442a36] px-7 text-sm font-bold text-white shadow-[0_12px_30px_rgba(68,42,54,0.18)] transition hover:-translate-y-0.5 hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                Descubrir la colección
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#coleccion"
                className="inline-flex min-h-13 items-center justify-center gap-3 rounded-full border border-[#cdbeb3] bg-white/45 px-7 text-sm font-bold text-[#4d383e] transition hover:border-brand hover:bg-white/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                Conocer los aromas
                <ArrowDown aria-hidden className="size-4" />
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 border-t border-[#d8c9bf] pt-6">
              <div>
                <dt className="font-heading text-2xl font-semibold text-[#3c2830]">450 g</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider text-[#80716c]">
                  por vela
                </dd>
              </div>
              <div className="border-x border-[#d8c9bf] px-5">
                <dt className="font-heading text-2xl font-semibold text-[#3c2830]">84 h</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider text-[#80716c]">
                  de duración
                </dd>
              </div>
              <div className="pl-5">
                <dt className="font-heading text-2xl font-semibold text-[#3c2830]">4</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider text-[#80716c]">
                  aromas
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#442a36] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.label}
              className={`flex items-start gap-3 py-6 sm:gap-4 lg:py-7 ${
                index % 2 === 0 ? 'pr-4' : 'border-l border-white/10 pl-4'
              } ${index > 1 ? 'border-t border-white/10 lg:border-t-0' : ''} ${
                index > 0 ? 'lg:border-l lg:border-white/10 lg:pl-7' : ''
              }`}
            >
              <benefit.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-[#ef9eaa]" />
              <div>
                <p className="text-sm font-bold">{benefit.label}</p>
                <p className="mt-1 text-xs leading-5 text-white/55">{benefit.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {collection.length > 0 && (
        <section id="coleccion" className="scroll-mt-8 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col gap-6 sm:mb-16 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-brand">
                  La colección frutal
                </p>
                <h2 className="font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.035em] text-[#3c2830] sm:text-5xl lg:text-6xl">
                  Cuatro formas de ponerle
                  <span className="text-brand"> sabor al ambiente.</span>
                </h2>
              </div>
              <Link
                href="/productos"
                className="group inline-flex w-fit items-center gap-2 border-b border-[#6f5a60] pb-1 text-sm font-bold text-[#4c383f] transition hover:border-brand hover:text-brand"
              >
                Ver todo el catálogo
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>

            <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {collection.map((product, index) => {
                const note = productNote(product.slug)

                return (
                  <li key={product.id}>
                    <Link
                      href={`/productos/${product.slug}`}
                      className={`${styles.productCard} group block rounded-[2rem] ${note.accent} p-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand`}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.55rem] bg-[#ead7c4]">
                        <Image
                          src={cloudinaryUrl(product.imagePublicId, 720)}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                        />
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                          <span className="rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4b383e] backdrop-blur-md">
                            {note.label}
                          </span>
                          <span className="grid size-8 place-items-center rounded-full bg-[#442a36]/85 text-xs font-bold text-white backdrop-blur-md">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-3 pb-3 pt-5">
                        <div>
                          <h3 className="font-heading text-xl font-semibold text-[#35252b]">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs text-[#66575a]">{note.note}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#35252b]">
                            {formatPrice(product.price)}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#705e62]">
                            Ver <ArrowRight aria-hidden className="size-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      )}

      <section className="overflow-hidden bg-[#3d2732] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f2b5bd]">
              <Heart aria-hidden className="size-3.5 fill-current" />
              El ritual Kadali
            </span>
            <h2 className="mt-7 font-heading text-5xl font-semibold leading-[0.9] tracking-[-0.04em] sm:text-6xl">
              De postre
              <span className="block text-[#ef9eaa]">a ritual.</span>
            </h2>
            <p className="mt-7 max-w-lg text-base leading-8 text-white/65">
              Cada vela se construye capa por capa y se termina a mano. El resultado es
              una pieza que transforma un rincón incluso antes de encenderla.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-7 border-y border-white/10 py-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef9eaa]">
                  01 · Mira
                </span>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Una pieza decorativa con detalles que parecen reales.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef9eaa]">
                  02 · Enciende
                </span>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Una fragancia frutal que cambia el ánimo del espacio.
                </p>
              </div>
            </div>

            <Link
              href="/productos"
              className="group mt-10 inline-flex min-h-13 items-center gap-3 rounded-full bg-white px-7 text-sm font-bold text-[#3d2732] transition hover:-translate-y-0.5 hover:bg-[#f9d7dd] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Encuentra la tuya
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>

          {storyPrimary && (
            <div className={`${styles.storyVisual} relative mx-auto w-full max-w-2xl pb-14 pl-10 sm:pb-20 sm:pl-24`}>
              <Link
                href={`/productos/${storyPrimary.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#d9b889] shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:rounded-[2.75rem]"
              >
                <Image
                  src={cloudinaryUrl(storyPrimary.imagePublicId, 900)}
                  alt={storyPrimary.name}
                  fill
                  sizes="(max-width: 1024px) 80vw, 44vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                />
              </Link>

              {storySecondary && storySecondary.id !== storyPrimary.id && (
                <Link
                  href={`/productos/${storySecondary.slug}`}
                  className="absolute bottom-0 left-0 aspect-[3/4] w-[38%] overflow-hidden rounded-[1.6rem] border-8 border-[#3d2732] bg-[#d9b889] shadow-2xl transition-transform duration-500 hover:-rotate-2 sm:rounded-[2rem]"
                >
                  <Image
                    src={cloudinaryUrl(storySecondary.imagePublicId, 520)}
                    alt={storySecondary.name}
                    fill
                    sizes="(max-width: 640px) 35vw, 240px"
                    className="object-cover"
                  />
                </Link>
              )}

              <div className="absolute -right-3 top-8 hidden rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-xl sm:block">
                <p className="font-heading text-2xl font-semibold">100%</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                  hecha a mano
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className={`${styles.finalCta} relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#dce6a7] px-6 py-16 text-center sm:px-12 sm:py-20 lg:rounded-[3.5rem] lg:py-24`}>
          <span className="absolute -left-14 -top-20 size-52 rounded-full bg-[#f1a2ad]/65 blur-2xl" aria-hidden />
          <span className="absolute -bottom-24 -right-10 size-64 rounded-full bg-white/50 blur-2xl" aria-hidden />
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#536025]">
              Tu próximo aroma favorito
            </p>
            <h2 className="mt-5 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.035em] text-[#34401d] sm:text-5xl lg:text-6xl">
              Tu rincón favorito merece oler delicioso.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#5c6341] sm:text-base">
              Explora {categories[0]?.name?.toLowerCase() ?? 'nuestra colección'} y elige
              la vela que mejor combina con tu mood.
            </p>
            <Link
              href={collectionHref}
              className="group mt-9 inline-flex min-h-13 items-center gap-3 rounded-full bg-[#3d2732] px-8 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3d2732]"
            >
              Elegir mi aroma
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
