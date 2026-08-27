'use client'

import { useState } from 'react'
import { SlidersVertical } from 'lucide-react'
import IconButton from '@/ui/common/icon-button'
import CategoryTabs from './category-tabs'
import FiltersBar from './filters-bar'

type Category = { id: number; name: string; slug: string }
type Fragrance = { fragrance: string; fragranceSlug: string }

type Props = {
  categories: Category[]
  fragrances: Fragrance[]
}

export default function FilterRow({ categories, fragrances }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 md:flex md:gap-3">
      <IconButton
        icon={SlidersVertical}
        label={open ? 'Ocultar filtros' : 'Mostrar filtros'}
        variant="raised"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="col-start-1 row-start-1 shrink-0 md:col-auto md:row-auto"
      />

      {/* En mobile el panel ocupa una segunda fila completa y se anima en altura.
          Desde md conserva la apertura horizontal original mediante max-width. */}
      <div
        aria-hidden={!open}
        className={`col-span-2 col-start-1 row-start-2 w-full overflow-hidden transition-[max-width,max-height,opacity] duration-300 ease-out md:col-auto md:row-auto md:-m-2 md:w-auto md:p-2 ${
          open
            ? 'max-h-96 opacity-100 md:max-w-3xl'
            : 'pointer-events-none max-h-0 opacity-0 md:max-h-11 md:max-w-0'
        }`}
      >
        <FiltersBar
          fragrances={fragrances}
          onClose={() => setOpen(false)}
          className="mt-3 w-full md:mt-0"
        />
      </div>

      <CategoryTabs
        categories={categories}
        className="col-start-2 row-start-1 min-w-0 md:col-auto md:row-auto md:ml-auto"
      />
    </div>
  )
}
