'use client'

import { PARAM } from '@/lib/catalog/filters'
import CategoryPill from '@/ui/common/category-pill'
import { useFilterParams } from './use-filter-params'

type Category = { id: number; name: string; slug: string }

type Props = {
  categories: Category[]
  className?: string
}

export default function CategoryTabs({ categories, className = '' }: Props) {
  const { searchParams, setParam } = useFilterParams()
  const selected = searchParams.getAll(PARAM.cat)
  const allActive = selected.length === 0

  function toggleAll() {
    setParam(PARAM.cat, null)
  }

  function toggleCat(slug: string) {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug]
    setParam(PARAM.cat, next.length > 0 ? next : null)
  }

  return (
    <div className={`flex gap-2 overflow-x-auto scrollbar-hidden md:flex-wrap md:justify-end ${className}`}>
      <CategoryPill label="Todos" active={allActive} onClick={toggleAll} />
      {categories.map((cat) => (
        <CategoryPill
          key={cat.id}
          label={cat.name}
          active={selected.includes(cat.slug)}
          onClick={() => toggleCat(cat.slug)}
        />
      ))}
    </div>
  )
}
