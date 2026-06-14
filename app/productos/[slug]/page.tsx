import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "../../lib/queries";
import { cloudinaryUrl } from "../../lib/cloudinary";
import AddToCartButton from "../../ui/add-to-cart-button";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getProductBySlug(slug);
  if (!producto) {
    return { title: "Producto no encontrado | Kadali" };
  }
  return {
    title: `${producto.name} | Kadali`,
    description: producto.description ?? `Conoce ${producto.name} en Kadali.`,
  };
}

export default async function ProductoDetallePage({ params }: Props) {
  const { slug } = await params;
  const producto = await getProductBySlug(slug);

  if (!producto) notFound();

  const imagenPrincipal = producto.images[0]?.cloudinaryPublicId ?? null;

  return (
    <div>
      <h1>{producto.name}</h1>

      <div>
        {producto.images.map((img) => (
          <img
            key={img.id}
            src={cloudinaryUrl(img.cloudinaryPublicId, 500)}
            alt={producto.name}
            width={250}
          />
        ))}
      </div>

      <p>${Number(producto.price).toLocaleString("es-CO")} COP</p>
      <p>{producto.description}</p>
      <p>Stock disponible: {producto.stock}</p>

      <AddToCartButton
        product={{
          productId: producto.id,
          slug: producto.slug,
          name: producto.name,
          price: Number(producto.price),
          imagePublicId: imagenPrincipal,
        }}
        stock={producto.stock}
      />
    </div>
  );
}
