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
    // overflow-x-auto habilita el scroll horizontal de categorías en móvil, pero al
    // fijar un eje el otro (overflow-y) deja de ser visible y también recorta: eso
    // cortaba la shadow-sm/hover:shadow-md de los pills arriba/abajo y a la derecha.
    // p-2.5 le da aire dentro de la zona de recorte; -my/-mr lo compensan para que
    // los pills queden igual (no compensamos la izquierda para no pisar el ml-auto;
    // ese padding izquierdo lo absorbe la holgura del ml-auto / el px-6 de la página).
    <div
      className={`-my-2.5 -mr-2.5 flex gap-2 overflow-x-auto scrollbar-hidden p-2.5 md:flex-wrap md:justify-end ${className}`}
    >
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
