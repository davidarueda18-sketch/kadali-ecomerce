import CategoryFilter from './category-filter'
import FilterSection from './filter-section'
import PriceFilter from './price-filter'

type Category = { id: number; name: string; slug: string }

type Props = {
  categories: Category[]
}

export default function FiltersSidebar({ categories }: Props) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <h2 className="font-heading text-lg font-semibold text-fg mb-2">Filtros</h2>
      <FilterSection title="Categorías">
        <CategoryFilter categories={categories} />
      </FilterSection>
      <FilterSection title="Precio" defaultOpen={false}>
        <PriceFilter />
      </FilterSection>
    </aside>
  )
}
