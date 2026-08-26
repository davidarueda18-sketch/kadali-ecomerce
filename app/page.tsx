import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Camera,
  Eye,
  Flame,
  Gift,
  Heart,
  Mail,
  MessageSquareText,
  PackageCheck,
  Sparkles,
  UtensilsCrossed,
  Wind,
} from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { formatPrice } from '@/lib/format'
import { getActiveProducts, getActiveProductThemes } from '@/lib/db/queries'
import HeroCompanions from '@/ui/home/hero-companions'
import NewsletterForm from '@/ui/home/newsletter-form'
import FavoriteButton from '@/ui/product/favorite-button'
import styles from './home.module.css'

export const metadata: Metadata = {
  title: 'Kadali — Objetos deliciosamente inesperados',
  description:
    'Velas artesanales inspiradas en postres y frutas, hechas en Colombia para regalar y transformar tus espacios.',
}

const PRODUCT_ORDER = [
  'vida-fresastica',
  'dulce-delito',
  'mera-mora',
  'limalaya',
  'sand-ia',
]

const PRODUCT_CARD_ORDER = [
  'limalaya',
  'vida-fresastica',
  'sand-ia',
  'mera-mora',
  'dulce-delito',
]

const HOME_HERO_ORDER = ['sand-ia', 'mera-mora', 'dulce-delito', 'limalaya']

const PRODUCT_NOTES: Record<
  string,
  { label: string; note: string; accent: string }
> = {
  limalaya: {
    label: 'Cítrica',
    note: 'Lima · fresca y brillante',
    accent: '#dfe8a7',
  },
  'vida-fresastica': {
    label: 'Frutal',
    note: 'Fresa · dulce y vibrante',
    accent: '#f4c0bd',
  },
  'sand-ia': {
    label: 'Refrescante',
    note: 'Sandía · jugosa y alegre',
    accent: '#cbdc9a',
  },
  'mera-mora': {
    label: 'Intensa',
    note: 'Mora · suave y envolvente',
    accent: '#d9b9ce',
  },
  'dulce-delito': {
    label: 'Golosa',
    note: 'Chocolate · intensa y cremosa',
    accent: '#c89a7b',
  },
}

const BENEFITS = [
  {
    icon: UtensilsCrossed,
    label: 'No te la comas',
    detail: 'Aunque entendemos la confusión.',
  },
  {
    icon: Flame,
    label: 'Sí, prende de verdad',
    detail: 'Bonita, aromática y funcional.',
  },
  {
    icon: Wind,
    label: 'Huele a antojo',
    detail: 'Sin ensuciar ningún plato.',
  },
  {
    icon: Eye,
    label: 'Difícil de ignorar',
    detail: 'Ese es precisamente el punto.',
  },
]

const HOME_IMAGES = {
  strawberryDetail: 'ChatGPT_Image_13_ago_2026_12_30_01_bkbzr8',
  strawberryHand: 'ChatGPT_Image_13_ago_2026_12_55_13_qmeemb',
  strawberryEditorial: 'ChatGPT_Image_13_ago_2026_12_14_15_eoladx',
  chocolateEditorial: 'Choco_theme_qywj68',
  limeEditorial: 'ChatGPT_Image_13_ago_2026_12_38_12_pz8b1d',
  berryEditorial: 'ChatGPT_Image_13_ago_2026_12_01_29_dkyvxb',
  berryClose: 'ChatGPT_Image_13_ago_2026_12_34_08_hgizto',
  watermelonEditorial: 'ChatGPT_Image_13_ago_2026_12_35_36_rpflku',
} as const

const SPACE_CARDS = [
  { src: '/images/kadali-home-interior.png', label: 'Mesa auxiliar', local: true },
  { src: HOME_IMAGES.chocolateEditorial, label: 'Biblioteca' },
  { src: HOME_IMAGES.strawberryHand, label: 'Escritorio' },
  { src: HOME_IMAGES.berryEditorial, label: 'Tocador' },
]

const SOCIAL_IMAGES = [
  HOME_IMAGES.strawberryEditorial,
  HOME_IMAGES.chocolateEditorial,
  HOME_IMAGES.limeEditorial,
  HOME_IMAGES.watermelonEditorial,
  HOME_IMAGES.berryClose,
]

export default async function HomePage() {
  const [products, themeProducts] = await Promise.all([
    getActiveProducts(),
    getActiveProductThemes(),
  ])
  const collection = PRODUCT_ORDER.map((slug) =>
    products.find((product) => product.slug === slug)
  ).filter((product): product is (typeof products)[number] => Boolean(product))
  const productCards = PRODUCT_CARD_ORDER.map((slug) =>
    products.find((product) => product.slug === slug)
  ).filter((product): product is (typeof products)[number] => Boolean(product))
  const heroCollection = HOME_HERO_ORDER.map((slug) =>
    themeProducts.find((product) => product.slug === slug)
  ).filter(
    (product): product is (typeof themeProducts)[number] => Boolean(product)
  )

  const heroProduct = heroCollection[0] ?? collection[0]
  const heroCompanions = (heroCollection.length > 0 ? heroCollection : collection).filter(
    (product) => product.id !== heroProduct?.id
  )

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroHalo} aria-hidden />
        <div className="relative z-10 mx-auto grid min-h-svh max-w-7xl items-center gap-x-12 gap-y-10 px-5 pb-12 pt-28 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:grid-rows-[auto_auto] lg:gap-x-16 lg:gap-y-0 lg:px-12 lg:pb-16 lg:pt-28">
          <div className="max-w-2xl lg:col-start-1 lg:row-start-1 lg:self-end">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d9c7ba] bg-white/55 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.19em] text-[#694b50] backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              ¿Te la vas a comer?
            </div>

            <h1
              id="hero-title"
              className="font-heading text-[clamp(3.65rem,8vw,7.4rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-[#3c2830]"
            >
              Esto no es
              <span className="block text-brand">un postre.</span>
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
                        Sí. Es una vela.
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

                <HeroCompanions products={heroCompanions.slice(0, 3)} />
              </div>

              <div className="absolute -left-4 top-10 hidden -rotate-6 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-bold text-[#593a45] shadow-lg backdrop-blur-md sm:block lg:-left-12">
                Se ve deliciosa ✦
              </div>
            </div>
          )}

          <div className="max-w-2xl lg:col-start-1 lg:row-start-2 lg:self-start">
            <p className="max-w-lg text-base leading-7 text-[#6f615c] sm:text-lg sm:leading-8 lg:mt-8">
              Aunque tenemos nuestras dudas.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/productos"
                className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-[#442a36] px-7 text-sm font-bold text-white shadow-[0_12px_30px_rgba(68,42,54,0.18)] transition hover:-translate-y-0.5 hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                Quiero verlas
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#antojos"
                className="inline-flex min-h-13 items-center justify-center gap-3 rounded-full border border-[#cdbeb3] bg-white/45 px-7 text-sm font-bold text-[#4d383e] transition hover:border-brand hover:bg-white/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                Descubrir los aromas
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
                <dt className="font-heading text-2xl font-semibold text-[#3c2830]">100 %</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wider text-[#80716c]">
                  cera de soya
                </dd>
              </div>
              <div className="pl-5">
                <dt className="font-heading text-2xl font-semibold text-[#3c2830]">
                  {collection.length}
                </dt>
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

      {productCards.length > 0 && (
        <section id="antojos" className={styles.productsSection} aria-labelledby="products-title">
          <div className={styles.sectionHeadingRow}>
            <h2 id="products-title" className={styles.sectionTitle}>
              Escoge tu antojo.
            </h2>
            <Link href="/productos" className={styles.textLink}>
              Ver todas las velas <ArrowRight aria-hidden />
            </Link>
          </div>

          <ol className={styles.productGrid}>
            {productCards.map((product) => {
              const note = PRODUCT_NOTES[product.slug] ?? {
                label: 'Artesanal',
                note: 'Un aroma para disfrutar',
                accent: '#fcebee',
              }

              return (
                <li key={product.id}>
                  <article
                    className={styles.productCard}
                    style={{ backgroundColor: note.accent }}
                  >
                    <Link
                      href={`/productos/${product.slug}`}
                      aria-label={`Ver ${product.name}`}
                      className={styles.productCardLink}
                    >
                      <div className={styles.productImage}>
                        <Image
                          src={cloudinaryUrl(product.imagePublicId, 700)}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 45vw, 25vw"
                          className={styles.coverImage}
                        />
                        <div className={styles.productTags}>
                          <span>{product.name}</span>
                        </div>
                      </div>
                      <div className={styles.productCardFooter}>
                        <strong className={styles.productCardAmount}>
                          {formatPrice(product.price)}
                        </strong>
                        <div className={styles.productCardAction}>
                          <span>Ver</span>
                          <ArrowRight aria-hidden />
                        </div>
                      </div>
                    </Link>

                    <div className={styles.productFavorite}>
                      <FavoriteButton
                        product={{
                          productId: product.id,
                          slug: product.slug,
                          name: product.name,
                          price: Number(product.price),
                          imagePublicId: product.imagePublicId,
                        }}
                        size="sm"
                      />
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section id="nosotros" className={styles.storySection} aria-labelledby="story-title">
        <div className={styles.storyImagePrimary}>
          <Image
            src={cloudinaryUrl(HOME_IMAGES.strawberryDetail, 1100)}
            alt="Detalle de vela de frutos rojos que parece un postre"
            fill
            sizes="(max-width: 900px) 100vw, 36vw"
            className={styles.coverImage}
          />
          <h2 id="story-title">Parece postre.</h2>
        </div>

        <div className={styles.storyCopy}>
          <p className={styles.kicker}>Pero es una vela.</p>
          <ul>
            <li>
              <Heart aria-hidden />
              <span><strong>Hechas a mano</strong> con amor y cera de soya.</span>
            </li>
            <li>
              <Sparkles aria-hidden />
              <span><strong>Aromas intensos</strong> y deliciosamente inesperados.</span>
            </li>
            <li>
              <BadgeCheck aria-hidden />
              <span><strong>Objetos decorativos</strong> que se roban todas las miradas.</span>
            </li>
          </ul>
          <Link href="/productos" className={styles.smallButton}>
            Conoce más <ArrowRight aria-hidden />
          </Link>
        </div>

        <div className={styles.storyImageSecondary}>
          <Image
            src={cloudinaryUrl(HOME_IMAGES.strawberryHand, 1100)}
            alt="Vela Kadali sostenida a mano"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
            className={styles.coverImage}
          />
          <span>Hecha para mirar, oler y encender.</span>
        </div>
      </section>

      <section id="espacios" className={styles.spacesSection} aria-labelledby="spaces-title">
        <div className={styles.spacesCopy}>
          <h2 id="spaces-title" className={styles.sectionTitle}>
            Ponla donde todos la vean.
          </h2>
          <p>Los rincones aburridos no tienen por qué seguir así.</p>
          <Link href="/productos" className={styles.smallButton}>
            Ver ideas para mi casa <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className={styles.spacesGrid}>
          {SPACE_CARDS.map((card, index) => (
            <div
              key={card.label}
              className={`${styles.spaceCard} ${index === 0 ? styles.spaceCardWide : ''}`}
            >
              <Image
                src={card.local ? card.src : cloudinaryUrl(card.src, 800)}
                alt={`Vela Kadali en ${card.label.toLowerCase()}`}
                fill
                sizes="(max-width: 700px) 75vw, (max-width: 1100px) 40vw, 22vw"
                className={styles.coverImage}
              />
              <span>{card.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="regalos" className={styles.giftSection} aria-labelledby="gift-title">
        <div className={styles.giftVisual}>
          <Image
            src="/images/kadali-gift-box.png"
            alt="Vela Kadali de mora dentro de una caja de regalo rosa"
            fill
            sizes="(max-width: 900px) 100vw, 58vw"
            className={styles.coverImage}
          />
        </div>
        <div className={styles.giftCopy}>
          <p className={styles.handNote}>Excepto esto.</p>
          <h2 id="gift-title" className={styles.sectionTitle}>
            Para la persona que ya tiene todo.
          </h2>
          <div className={styles.giftBenefits}>
            <div><PackageCheck aria-hidden /><span>Empaque<br />sorprendente</span></div>
            <div><Gift aria-hidden /><span>Lista para<br />regalar</span></div>
            <div><MessageSquareText aria-hidden /><span>Tarjeta con<br />mensaje</span></div>
          </div>
          <Link href="/productos" className={styles.darkButton}>
            Ver regalos <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>

      <section className={styles.socialSection} aria-labelledby="social-title">
        <div className={styles.socialIntro}>
          <Camera aria-hidden />
          <h2 id="social-title" className={styles.sectionTitle}>
            Gente con buen gusto y decisiones cuestionables.
          </h2>
          <p>Etiqueta a @kadalivelas y apareces por aquí.</p>
          <Link href="/productos" className={styles.outlineButton}>
            Ver la colección <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className={styles.socialGrid}>
          {SOCIAL_IMAGES.map((image, index) => (
            <Link
              key={image}
              href="/productos"
              className={styles.socialCard}
              aria-label={`Descubrir vela Kadali ${index + 1}`}
            >
              <Image
                src={cloudinaryUrl(image, 620)}
                alt="Vela artesanal Kadali inspirada en un postre"
                fill
                sizes="(max-width: 700px) 45vw, 18vw"
                className={styles.coverImage}
              />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.newsletterSection} aria-labelledby="newsletter-title">
        <div>
          <Mail aria-hidden />
          <h2 id="newsletter-title">Correos ricos.<br />Cero spam aburrido.</h2>
        </div>
        <div className={styles.newsletterCopy}>
          <p>Novedades, lanzamientos y cosas deliciosas.</p>
          <NewsletterForm />
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/kadali-logo.svg" alt="Kadali" width={126} height={52} />
          <p>Objetos deliciosamente inesperados para casas que se niegan a ser aburridas.</p>
          <span>© Kadali {new Date().getFullYear()}</span>
        </div>
        <div>
          <h3>Comprar</h3>
          <Link href="/productos">Velas</Link>
          <Link href="#regalos">Regalos</Link>
          <Link href="/productos">Todos los productos</Link>
        </div>
        <div>
          <h3>Ayuda</h3>
          <Link href="/checkout">Envíos</Link>
          <Link href="/legal/devoluciones">Cuidados y devoluciones</Link>
          <Link href="/legal/terminos">Preguntas frecuentes</Link>
        </div>
        <div>
          <h3>Síguenos</h3>
          <span>Instagram</span>
          <span>TikTok</span>
          <span>Pinterest</span>
        </div>
        <div className={styles.footerNote}>
          <p>Seguimos haciendo velas que parecen comida.</p>
          <div>
            <Link href="/legal/terminos">Términos y condiciones</Link>
            <Link href="/legal/privacidad">Política de privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
