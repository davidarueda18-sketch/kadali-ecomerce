import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nombre = slug.replace(/-/g, " ");
  return {
    title: `${nombre} | Kadali`,
    description: `Conoce todos los detalles de ${nombre} en la tienda Kadali.`,
  };
}

export default async function ProductoDetallePage({ params }: Props) {
  const { slug } = await params;

  // TODO: reemplaza esto con la consulta real a tu fuente de datos
  // const producto = null;
  // if (!producto) notFound();

  return (
    <main>
      <h1>{slug.replace(/-/g, " ")}</h1>
      <p>Descripción, precio e imágenes del producto.</p>
    </main>
  );
}
