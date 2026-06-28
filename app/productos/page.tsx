import type { Metadata } from 'next'
import { Suspense } from 'react'
import { parseFilters } from '@/lib/catalog/filters'
import { getCatalogProducts, getCategories } from '@/lib/db/queries'
import CategoryTabs from '@/ui/catalog/category-tabs'
import ProductGrid from '@/ui/product/product-grid'
import SearchBox from '@/ui/catalog/search-box'
import ShowcaseHero from '@/ui/catalog/showcase-hero'
import NewsletterCard from '@/ui/catalog/newsletter-card'

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

  const [products, categories] = await Promise.all([
    getCatalogProducts(filters),
    getCategories(),
  ])

  const isFiltered = !!filters.q || (filters.categorySlugs?.length ?? 0) > 0
  const featured = products[0] ?? null

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header panel */}
      <div className="rounded-3xl bg-surface border border-line px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <CategoryTabs categories={categories} />
        </Suspense>
        <div className="w-full sm:w-64 shrink-0">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
      </div>

      {/* Showcase row: featured product + newsletter */}
      {!isFiltered && featured && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ShowcaseHero product={featured} />
          </div>
          <NewsletterCard />
        </div>
      )}

      {/* Catalog */}
      <section>
        <h2 className="font-heading text-2xl font-semibold text-fg mb-5">
          {isFiltered
            ? `${products.length} resultado${products.length !== 1 ? 's' : ''}`
            : 'Todos los productos'}
        </h2>
        <ProductGrid products={products} />
      </section>
    </div>
  )
}
