import type { SliderProduct } from './featured-slider'
import FeaturedSlider from './featured-slider'
import PromoBanner from './promo-banner'
import SentimentCard from './sentiment-card'
import CouponCard from './coupon-card'
import ProductTile from '@/ui/product/product-tile'

export type ShowcaseProduct = { id: number; name: string; slug: string; photo: string | null }

// La consulta solo entrega productos con hero, así que todas las tarjetas usan una
// imagen real de Cloudinary.
function pickShowcaseProducts(products: SliderProduct[]): ShowcaseProduct[] {
  return products.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    photo: p.imagePublicId,
  }))
}

type Props = {
  products: SliderProduct[]
}

export default function ShowcaseGrid({ products }: Props) {
  const [spotlight, tileA, tileB, promo] = pickShowcaseProducts(products)

  // lg:flex-1 hace que crezca para llenar lo que sobre del min-h del contenedor padre
  // (ver app/productos/page.tsx), en vez de asumir un alto fijo de nav+filtros: así se
  // adapta a la altura real de la fila de filtros en cualquier resolución. lg:min-h-0
  // es necesario para que el flex-grow pueda calcularse (si no, el min-height automático
  // del item evita que se achique/ajuste). Las 3 columnas se estiran (stretch, default de
  // grid) a esa altura resultante; los bloques internos reparten ese alto con grid-rows en
  // fracciones en vez de px fijos.
  return (
    <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[520px_3fr_2fr]">
      <FeaturedSlider products={products} />

      <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[2fr_1fr]">
        <PromoBanner product={promo ?? spotlight} />
        <SentimentCard product={spotlight} />
      </div>

      <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[1fr_1.3fr_1fr]">
        {tileA && <ProductTile product={tileA} />}
        <CouponCard />
        {tileB && <ProductTile product={tileB} />}
      </div>
    </div>
  )
}
