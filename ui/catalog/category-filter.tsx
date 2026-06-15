'use client'

import { PARAM } from '@/lib/catalog/filters'
import { useFilterParams } from './use-filter-params'

type Category = { id: number; name: string; slug: string }

type Props = {
  categories: Category[]
}

export default function CategoryFilter({ categories }: Props) {
  const { searchParams, setParam } = useFilterParams()

  const selected = searchParams.getAll(PARAM.cat)

  function toggle(slug: string) {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug]
    setParam(PARAM.cat, next.length > 0 ? next : null)
  }

  return (
    <>
      {categories.map((cat) => (
        <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(cat.slug)}
            onChange={() => toggle(cat.slug)}
            className="w-4 h-4 rounded border-line accent-brand"
          />
          <span className="text-sm text-fg group-hover:text-brand transition-colors">
            {cat.name}
          </span>
        </label>
      ))}
    </>
  )
}
