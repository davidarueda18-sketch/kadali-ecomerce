import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | Kadali",
  description:
    "Infórmate sobre cómo Kadali recopila, usa y protege tu información personal.",
};

export default function PrivacidadPage() {
  return (
    <main>
      <h1>Política de privacidad</h1>
      <p>
        Tu privacidad es importante para nosotros. Aquí detallamos cómo
        tratamos tus datos personales.
      </p>
    </main>
  );
}
