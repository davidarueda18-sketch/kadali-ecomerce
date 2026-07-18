'use client'

import { useState } from 'react'
import { PARAM } from '@/lib/catalog/filters'
import { formatPrice } from '@/lib/format'
import RangeSlider from '@/ui/common/range-slider'
import { useFilterParams } from './use-filter-params'

type Props = {
  min?: number
  max?: number
  step?: number
  className?: string
}

export default function PriceRange({
  min = 0,
  max = 200000,
  step = 5000,
  className = '',
}: Props) {
  const { searchParams, setParams } = useFilterParams()

  const rawMin = searchParams.get(PARAM.min)
  const rawMax = searchParams.get(PARAM.max)
  const urlLo = rawMin !== null ? Number(rawMin) : min
  const urlHi = rawMax !== null ? Number(rawMax) : max

  const [range, setRange] = useState<[number, number]>([urlLo, urlHi])
  const [prevKey, setPrevKey] = useState(`${urlLo}:${urlHi}`)

  // Refleja cambios de URL (navegación externa) durante render, no en un efecto
  const key = `${urlLo}:${urlHi}`
  if (key !== prevKey) {
    setPrevKey(key)
    setRange([urlLo, urlHi])
  }

  const [lo, hi] = range

  function commit([nlo, nhi]: [number, number]) {
    setParams({
      [PARAM.min]: nlo > min ? String(nlo) : null,
      [PARAM.max]: nhi < max ? String(nhi) : null,
    })
  }

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-brand-deep">Rango de precio</span>
        <span className="whitespace-nowrap text-sm font-bold text-brand-deep">
          {formatPrice(lo)} - {formatPrice(hi)} COP
        </span>
      </div>
      <RangeSlider
        min={min}
        max={max}
        step={step}
        value={range}
        onChange={setRange}
        onChangeEnd={commit}
        minLabel="Precio mínimo"
        maxLabel="Precio máximo"
        formatValue={formatPrice}
      />
    </div>
  )
}
