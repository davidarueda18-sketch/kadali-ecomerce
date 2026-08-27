'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { PARAM } from '@/lib/catalog/filters'

type Props = {
  layout: 'desktop' | 'mobile'
  placeholder?: string
}

const CATALOG_PATH = '/productos'

export default function NavSearch({
  layout,
  placeholder = 'Velas de postres',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onCatalog = pathname === CATALOG_PATH

  const urlQ = onCatalog ? searchParams.get(PARAM.q) ?? '' : ''

  const [value, setValue] = useState(urlQ)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  const [open, setOpen] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) mobileInputRef.current?.focus()
  }, [open])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Refleja cambios de URL (navegación externa) sin usar setState en un efecto
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ)
    setValue(urlQ)
  }

  // Cierra el panel móvil al cambiar de ruta (ajuste durante render, no en efecto)
  if (pathname !== prevPath) {
    setPrevPath(pathname)
    setOpen(false)
  }

  function applyQuery(q: string) {
    const trimmed = q.trim()
    if (onCatalog) {
      const params = new URLSearchParams(searchParams.toString())
      if (trimmed) params.set(PARAM.q, trimmed)
      else params.delete(PARAM.q)
      const query = params.toString()
      router.replace(query ? `${CATALOG_PATH}?${query}` : CATALOG_PATH, {
        scroll: false,
      })
    } else {
      router.push(
        trimmed
          ? `${CATALOG_PATH}?${PARAM.q}=${encodeURIComponent(trimmed)}`
          : CATALOG_PATH
      )
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (!onCatalog) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => applyQuery(v), 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    applyQuery(value)
    setOpen(false)
  }

  function handleSubmitButtonClick(e: React.MouseEvent) {
    if (!open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  if (layout === 'desktop') {
    return (
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex h-11 w-44 items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-sm lg:w-60 xl:w-72"
      >
        <input
          type="search"
          aria-label="Buscar productos"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-deep text-surface transition hover:bg-orchid-700"
        >
          <Search className="size-4" strokeWidth={1.75} />
        </button>
      </form>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end">
      <form
        role="search"
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className={`flex h-9 items-center justify-center overflow-hidden rounded-full bg-surface shadow-sm transition-[width,padding] duration-300 ease-out ${
          open ? 'w-full gap-1 pl-1.5 pr-1.5' : 'w-9 gap-0 pl-0 pr-0'
        }`}
      >
        <button
          type="button"
          aria-label="Cerrar búsqueda"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg-muted transition-[width,opacity] duration-200 hover:bg-bg-alt ${
            open ? 'w-7 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
        <input
          ref={mobileInputRef}
          type="search"
          aria-label="Buscar productos"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          className={`min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none transition-opacity duration-200 ${
            open ? 'w-full flex-1 opacity-100' : 'w-0 opacity-0'
          }`}
        />
        <button
          type="submit"
          aria-label="Buscar"
          aria-expanded={open}
          onClick={handleSubmitButtonClick}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-deep text-surface transition hover:bg-orchid-700"
        >
          <Search className="size-3.5" strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
