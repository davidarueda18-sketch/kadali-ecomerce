import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
export const metadata = {
  title: "Administración | Kadali",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link
            href="/admin"
            className="font-heading text-2xl font-semibold text-brand-deep"
          >
            Kadali{" "}
            <span className="ml-2 text-sm font-normal text-fg-muted">
              Administración
            </span>
          </Link>
          <div className="text-sm text-fg-muted">
            {admin.email} ·{" "}
            <Link href="/" className="text-brand">
              Ver tienda
            </Link>
          </div>
        </div>
        <nav
          aria-label="Administración"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4"
        >
          {[
            ["Resumen", "/admin"],
            ["Pedidos", "/admin/pedidos"],
            ["Productos e inventario", "/admin/productos"],
            ["Categorías", "/admin/categorias"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-petal-100"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8">{children}</main>
    </div>
  );
}
