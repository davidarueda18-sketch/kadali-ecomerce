import type { Metadata } from 'next'
import { Suspense } from 'react'
import { parseFilters } from '@/lib/catalog/filters'
import { getCatalogProducts, getCategories } from '@/lib/db/queries'
import CategoryTabs from '@/ui/catalog/category-tabs'
import FiltersSidebar from '@/ui/catalog/filters-sidebar'
import ProductGrid from '@/ui/product/product-grid'
import SearchBox from '@/ui/catalog/search-box'
import SortSelect from '@/ui/catalog/sort-select'

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

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header: tabs + search */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <CategoryTabs categories={categories} />
        </Suspense>
        <div className="w-full sm:w-64">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
      </div>

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-10">
        <Suspense>
          <FiltersSidebar categories={categories} />
        </Suspense>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Toolbar: count + sort */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-fg-muted">{products.length} productos</p>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
