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
    <div className="flex items-center gap-3">
      <IconButton
        icon={SlidersVertical}
        label={open ? 'Ocultar filtros' : 'Mostrar filtros'}
        variant="plain"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="shrink-0"
      />

      {/* Se abre de izquierda a derecha en la misma línea (igual que el buscador móvil).
          FiltersBar usa min-w-max (no un valor fijo) para que su ancho nunca baje del
          contenido natural: así, mientras este max-width animado sea menor, FiltersBar se
          mantiene a tamaño completo y solo se revela/recorta (sin comprimir el texto de
          precio); si usara un mínimo fijo menor al contenido real, habría un tramo de la
          animación donde el ancho ofrecido cae entre ese mínimo y el ancho real, forzando
          al texto a encogerse y saltar. max-h se limita al cerrar porque min-w-max en
          FiltersBar fuerza su ancho interno incluso con max-width:0 en el padre, lo que
          inflaría el alto de la fila. */}
      <div
        aria-hidden={!open}
        className={`overflow-hidden transition-[max-width,max-height,opacity] duration-300 ease-out ${
          open ? 'max-w-3xl max-h-96 opacity-100' : 'pointer-events-none max-w-0 max-h-11 opacity-0'
        }`}
      >
        <FiltersBar fragrances={fragrances} onClose={() => setOpen(false)} className="w-full" />
      </div>

      <CategoryTabs categories={categories} className="ml-auto" />
    </div>
  )
}
