'use client'

import { X } from 'lucide-react'
import { PARAM } from '@/lib/catalog/filters'
import IconButton from '@/ui/common/icon-button'
import SelectPill from '@/ui/common/select-pill'
import PriceRange from './price-range'
import { useFilterParams } from './use-filter-params'

type Fragrance = { fragrance: string; fragranceSlug: string }

type Props = {
  fragrances: Fragrance[]
  onClose: () => void
  className?: string
}

export default function FiltersBar({ fragrances, onClose, className = '' }: Props) {
  const { searchParams, setParam } = useFilterParams()
  const selectedFrag = searchParams.get(PARAM.frag) ?? ''

  const fragranceOptions = [
    { value: '', label: 'Tipo de fragancia' },
    ...fragrances.map((f) => ({ value: f.fragranceSlug, label: f.fragrance })),
  ]

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-4 rounded-3xl bg-surface px-4 py-4 shadow-sm md:w-auto md:min-w-max md:flex-row md:items-center md:gap-5 md:rounded-full md:px-3 md:py-2.5 ${className}`}
    >
      <IconButton
        icon={X}
        label="Cerrar filtros"
        variant="raised"
        size="sm"
        onClick={onClose}
        className="self-start border border-line md:self-auto"
      />
      <PriceRange className="min-w-0 flex-1" />
      <SelectPill
        label="Tipo de fragancia"
        value={selectedFrag}
        options={fragranceOptions}
        onChange={(v) => setParam(PARAM.frag, v || null)}
        className="w-full shrink-0 md:w-56 lg:w-64"
      />
    </div>
  )
}
