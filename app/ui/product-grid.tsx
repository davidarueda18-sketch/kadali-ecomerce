import ProductCard from './product-card'

type Product = {
  id: number
  name: string
  slug: string
  price: string
  description: string | null
  imagePublicId: string | null
}

type Props = {
  products: Product[]
}

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-fg-muted text-sm">
        No hay productos que coincidan con los filtros seleccionados.
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard {...p} />
        </li>
      ))}
    </ul>
  )
}
