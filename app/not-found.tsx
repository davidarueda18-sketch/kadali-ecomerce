import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada | Kadali",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  // min-h: 100dvh menos el alto del nav (73px) para llenar el área visible
  return (
    <section className="relative flex min-h-[calc(100dvh-73px)] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Blobs decorativos de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-petal-200 opacity-60 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-matcha-200 opacity-50 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-orchid-300 opacity-20 blur-3xl" />
      </div>

      {/* Vela recién apagada — la página "se apagó" */}
      <svg
        aria-hidden
        viewBox="0 0 100 150"
        className="mb-4 h-28 w-auto"
        fill="none"
      >
        {/* Humo que sube del pabilo */}
        <path
          d="M50 44 C 44 36, 58 32, 50 24 C 43 16, 57 12, 50 4"
          className="stroke-orchid-300"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M50 44 C 55 38, 46 34, 52 28"
          className="stroke-petal-400"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Pabilo apagado */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="44"
          className="stroke-fg"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Cuerpo de la vela */}
        <rect x="32" y="50" width="36" height="80" rx="12" className="fill-petal-200" />
        {/* Cera superior */}
        <ellipse cx="50" cy="52" rx="18" ry="5" className="fill-petal-100" />
        {/* Platito / base */}
        <ellipse cx="50" cy="134" rx="32" ry="7" className="fill-matcha-200" opacity="0.6" />
      </svg>

      {/* Número grande decorativo */}
      <p
        aria-hidden
        className="bg-gradient-to-br from-orchid-600 to-petal-400 bg-clip-text font-heading text-7xl font-bold leading-none text-transparent sm:text-8xl"
      >
        404
      </p>

      <h1 className="mt-6 font-heading text-2xl font-semibold text-fg sm:text-3xl">
        Esta página se apagó
      </h1>

      <p className="mt-3 max-w-md text-sm text-fg-muted sm:text-base">
        No encontramos lo que buscabas. Puede que el enlace haya cambiado o que
        la página ya no exista. Volvamos a encender la búsqueda.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-strong px-6 py-3 text-sm font-semibold text-surface transition-colors hover:bg-orchid-700"
        >
          Volver al inicio
        </Link>
        <Link
          href="/productos"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-fg transition-colors hover:bg-bg-alt"
        >
          Ver productos
        </Link>
      </div>
    </section>
  );
}
