import type { Metadata } from "next";
import Link from "next/link";
import { getActiveProducts } from "../lib/queries";
import { cloudinaryUrl } from "../lib/cloudinary";

export const metadata: Metadata = {
  title: "Catálogo de productos | Kadali",
  description:
    "Explora todos los productos de Kadali: velas artesanales, aromas y colecciones especiales.",
};

export default async function ProductosPage() {
  const productos = await getActiveProducts();

  return (
    <div>
      <h1>Catálogo de productos</h1>
      <ul>
        {productos.map((p) => (
          <li key={p.id} style={{ marginBottom: "16px" }}>
            <Link href={`/productos/${p.slug}`}>
              {p.imagePublicId && (
                <img
                  src={cloudinaryUrl(p.imagePublicId, 300)}
                  alt={p.name}
                  width={150}
                />
              )}
              <div>{p.name}</div>
            </Link>
            <div>${Number(p.price).toLocaleString("es-CO")} COP</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
