import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada | Kadali",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  return (
    <main>
      <h1>404 — Página no encontrada</h1>
      <p>Lo sentimos, no pudimos encontrar lo que buscabas.</p>
      <Link href="/">Volver al inicio</Link>
    </main>
  );
}
