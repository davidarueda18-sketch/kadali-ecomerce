export type SortOption = 'new' | 'price-asc' | 'price-desc'

export type CatalogFilters = {
  categorySlugs?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: SortOption
  q?: string
}

export const PARAM = {
  cat: 'cat',
  sort: 'sort',
  min: 'min',
  max: 'max',
  q: 'q',
} as const

const VALID_SORTS: SortOption[] = ['new', 'price-asc', 'price-desc']

export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>
): CatalogFilters {
  const catRaw = searchParams[PARAM.cat]
  const categorySlugs = catRaw
    ? Array.isArray(catRaw)
      ? catRaw
      : [catRaw]
    : undefined

  const sortRaw = searchParams[PARAM.sort]
  const sort =
    typeof sortRaw === 'string' && VALID_SORTS.includes(sortRaw as SortOption)
      ? (sortRaw as SortOption)
      : 'new'

  const minRaw = Number(searchParams[PARAM.min])
  const maxRaw = Number(searchParams[PARAM.max])

  const minPrice = !isNaN(minRaw) && minRaw > 0 ? minRaw : undefined
  const maxPrice = !isNaN(maxRaw) && maxRaw > 0 ? maxRaw : undefined

  const qRaw = searchParams[PARAM.q]
  const q = typeof qRaw === 'string' && qRaw.trim() ? qRaw.trim() : undefined

  return { categorySlugs, sort, minPrice, maxPrice, q }
}
