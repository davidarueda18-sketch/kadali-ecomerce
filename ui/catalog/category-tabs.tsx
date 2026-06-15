'use client'

import { PARAM } from '@/lib/catalog/filters'
import { useFilterParams } from './use-filter-params'

type Category = { id: number; name: string; slug: string }

type Props = {
  categories: Category[]
}

export default function CategoryTabs({ categories }: Props) {
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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={toggleAll}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          allActive
            ? 'bg-brand-strong text-surface'
            : 'bg-surface border border-line text-fg hover:border-brand'
        }`}
      >
        Todos
      </button>
      {categories.map((cat) => {
        const active = selected.includes(cat.slug)
        return (
          <button
            key={cat.id}
            onClick={() => toggleCat(cat.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-strong text-surface'
                : 'bg-surface border border-line text-fg hover:border-brand'
            }`}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
