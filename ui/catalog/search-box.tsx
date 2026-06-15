'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { PARAM } from '@/lib/catalog/filters'
import { useFilterParams } from './use-filter-params'

export default function SearchBox() {
  const { searchParams, setParam } = useFilterParams()
  const [value, setValue] = useState(searchParams.get(PARAM.q) ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(searchParams.get(PARAM.q) ?? '')
  }, [searchParams])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParam(PARAM.q, v.trim() || null)
    }, 400)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-muted" strokeWidth={1.75} />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Buscar productos..."
        className="w-full rounded-full border border-line bg-surface pl-9 pr-4 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand"
      />
    </div>
  )
}
