import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kadali — Velas artesanales",
  description:
    "Descubre la colección de velas artesanales de Kadali. Aromas únicos, hechas con amor.",
};

import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>Bienvenida a Kadali</h1>
      <p>Velas artesanales con aromas únicos para cada momento.</p>
      <Link href="/productos">Ver catálogo</Link>
    </div>
  );
}
