import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de productos | Kadali",
  description:
    "Explora todos los productos de Kadali: velas artesanales, aromas y colecciones especiales.",
};

export default function ProductosPage() {
  return (
    <main>
      <h1>Catálogo de productos</h1>
      <p>Aquí encontrarás todos nuestros productos disponibles.</p>
    </main>
  );
}
