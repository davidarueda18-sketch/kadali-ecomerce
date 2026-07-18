import type { Metadata } from 'next'
import { Suspense } from 'react'
import { parseFilters } from '@/lib/catalog/filters'
import {
  getActiveProducts,
  getCatalogProducts,
  getCategories,
  getFragrances,
} from '@/lib/db/queries'
import FilterRow from '@/ui/catalog/filter-row'
import ShowcaseGrid from '@/ui/catalog/showcase-grid'
import ProductGrid from '@/ui/product/product-grid'

export const metadata: Metadata = {
  title: 'Catálogo | Kadali',
  description:
    'Explora todos los productos de Kadali: velas artesanales, aromas y colecciones especiales.',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductosPage({ searchParams }: Props) {
  const sp = await searchParams
  const filters = parseFilters(sp)

  const [products, categories, fragrances, featured] = await Promise.all([
    getCatalogProducts(filters),
    getCategories(),
    getFragrances(),
    getActiveProducts(),
  ])

  const isFiltered =
    !!filters.q ||
    (filters.categorySlugs?.length ?? 0) > 0 ||
    (filters.fragranceSlugs?.length ?? 0) > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined

  const showShowcase = !isFiltered && featured.length > 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* Filtros + showcase van en su propio contenedor con el min-h de "una pantalla":
          si esa altura mínima se pusiera en el <div> de más afuera (junto con el catálogo,
          que siempre es mucho más alto que una pantalla), el catálogo por sí solo ya supera
          ese mínimo y no queda espacio "extra" para que el showcase pueda crecer con flex-1.
          7.5rem = nav (5rem/80px) + el padding superior de este contenedor (py-8/2rem/32px) +
          un pequeño margen de seguridad contra redondeo del navegador. */}
      <div
        className={
          showShowcase ? 'flex flex-col gap-6 lg:min-h-[max(560px,calc(100dvh-7.5rem))]' : undefined
        }
      >
        {/* Fila de filtros */}
        <Suspense>
          <FilterRow categories={categories} fragrances={fragrances} />
        </Suspense>

        {/* Showcase: bento grid (slider + banner + tarjetas + tiles, solo sin filtros).
            Crece (flex-1) para ocupar lo que sobre del alto reservado arriba, así se adapta
            a la altura real de la fila de filtros en vez de asumir un valor fijo. */}
        {showShowcase && <ShowcaseGrid products={featured} />}
      </div>

      {/* Catálogo */}
      <section>
        <h2 className="mb-5 font-heading text-2xl font-semibold text-fg">
          {isFiltered
            ? `${products.length} resultado${products.length !== 1 ? 's' : ''}`
            : 'Todos los productos'}
        </h2>
        <ProductGrid products={products} />
      </section>
    </div>
  )
}
