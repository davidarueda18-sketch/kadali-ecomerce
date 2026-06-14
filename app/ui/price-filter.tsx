'use client'

import { useEffect, useState } from 'react'
import { PARAM } from '../lib/filters'
import { useFilterParams } from './use-filter-params'

export default function PriceFilter() {
  const { searchParams, setParam } = useFilterParams()

  const [min, setMin] = useState(searchParams.get(PARAM.min) ?? '')
  const [max, setMax] = useState(searchParams.get(PARAM.max) ?? '')

  useEffect(() => {
    setMin(searchParams.get(PARAM.min) ?? '')
    setMax(searchParams.get(PARAM.max) ?? '')
  }, [searchParams])

  function apply() {
    setParam(PARAM.min, min.trim() || null)
    setParam(PARAM.max, max.trim() || null)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Mín"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand"
        />
        <input
          type="number"
          placeholder="Máx"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand"
        />
      </div>
      <p className="text-xs text-fg-muted">Precios en COP. Presiona Enter o haz clic fuera para aplicar.</p>
    </div>
  )
}
