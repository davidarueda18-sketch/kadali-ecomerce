import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kadali — Velas artesanales",
  description:
    "Descubre la colección de velas artesanales de Kadali. Aromas únicos, hechas con amor.",
};

export default function HomePage() {
  return (
    <main>
      <h1>Bienvenida a Kadali</h1>
      <p>Velas artesanales con aromas únicos para cada momento.</p>
    </main>
  );
}
