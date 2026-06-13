import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones | Kadali",
  description:
    "Lee los términos y condiciones de uso de la tienda Kadali antes de realizar tu compra.",
};

export default function TerminosPage() {
  return (
    <main>
      <h1>Términos y condiciones</h1>
      <p>
        Al usar este sitio y realizar compras, aceptas los términos y
        condiciones descritos a continuación.
      </p>
    </main>
  );
}
