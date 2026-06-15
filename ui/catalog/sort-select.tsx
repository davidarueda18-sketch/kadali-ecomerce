'use client'

import type { SortOption } from '@/lib/catalog/filters'
import { PARAM } from '@/lib/catalog/filters'
import { useFilterParams } from './use-filter-params'

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'new', label: 'Más recientes' },
  { value: 'price-asc', label: 'Precio ↑' },
  { value: 'price-desc', label: 'Precio ↓' },
]

export default function SortSelect() {
  const { searchParams, setParam } = useFilterParams()
  const current = (searchParams.get(PARAM.sort) ?? 'new') as SortOption

  return (
    <select
      value={current}
      onChange={(e) => setParam(PARAM.sort, e.target.value)}
      className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg focus:outline-none focus:border-brand cursor-pointer"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
