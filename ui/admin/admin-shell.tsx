"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Folder,
  Tag,
  ChartNoAxesCombined,
  Mail,
  Settings,
  Plus,
  Menu,
  X,
  Store,
  Flame,
} from "lucide-react";

const groups = [
  {
    name: "Inicio",
    items: [{ name: "Resumen", href: "/admin", icon: LayoutDashboard }],
  },
  {
    name: "Operación",
    items: [
      { name: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
      { name: "Clientes", href: "/admin/clientes", icon: Users },
    ],
  },
  {
    name: "Catálogo",
    items: [
      { name: "Productos", href: "/admin/productos", icon: Package },
      { name: "Categorías", href: "/admin/categorias", icon: Folder },
      { name: "Promociones", href: "/admin/promociones", icon: Tag },
    ],
  },
  {
    name: "Análisis",
    items: [
      { name: "Reportes", href: "/admin/reportes", icon: ChartNoAxesCombined },
    ],
  },
  {
    name: "Administración",
    items: [
      { name: "Correos", href: "/admin/correos", icon: Mail },
      { name: "Configuración", href: "/admin/configuracion", icon: Settings },
    ],
  },
];
export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const current = groups
    .flatMap((group) => group.items)
    .find((item) =>
      item.href === "/admin"
        ? pathname === item.href
        : pathname.startsWith(item.href),
    );
  const navigation = (
    <nav aria-label="Administración" className="admin-nav">
      {groups.map((group) => (
        <div key={group.name} className="admin-nav-group">
          <p className="admin-nav-label">{group.name}</p>
          {group.items.map(({ name, href, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => menu.current?.close()}
                className={`admin-nav-link ${active ? "is-active" : ""}`}
              >
                <Icon size={19} aria-hidden="true" />
                {name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
  return (
    <div className="admin-app">
      <a href="#admin-content" className="admin-skip">
        Saltar al contenido
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-logo">
          <span className="admin-logo-mark">
            <Flame size={24} aria-hidden="true" />
          </span>
          <span>
            Kadali<small>Tu espacio de trabajo</small>
          </span>
        </Link>
        {navigation}
        <div className="admin-sidebar-footer">
          <span className="admin-avatar" aria-hidden="true">
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <strong>Administración</strong>
            <span className="block truncate" title={email}>
              {email}
            </span>
          </span>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="admin-menu-button"
              aria-label="Abrir menú de administración"
              onClick={() => menu.current?.showModal()}
            >
              <Menu size={22} />
            </button>
            <span className="text-sm text-fg-muted">
              Administración{" "}
              <span aria-hidden="true" className="mx-2">
                /
              </span>{" "}
              <strong className="text-fg">{current?.name ?? "Resumen"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="admin-store-link">
              <Store size={17} aria-hidden="true" />
              <span>Ver tienda</span>
            </Link>
            <Link href="/admin/pedidos/nuevo" className="admin-primary">
              <Plus size={17} aria-hidden="true" />
              Registrar venta
            </Link>
          </div>
        </header>
        <main id="admin-content" className="admin-main">
          {children}
        </main>
        <footer className="admin-footer">
          Hecho con calma, administrado con claridad.{" "}
          <span>Kadali · COP · Hora de Colombia</span>
        </footer>
      </div>
      <dialog
        ref={menu}
        className="admin-mobile-menu"
        aria-label="Menú de administración"
        onClick={(event) => {
          if (event.target === event.currentTarget) menu.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-line p-5">
          <span className="font-heading text-2xl">Kadali</span>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="admin-icon-button"
            onClick={() => menu.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        {navigation}
        <p className="break-all px-5 pb-5 text-sm text-fg-muted">{email}</p>
      </dialog>
    </div>
  );
}
