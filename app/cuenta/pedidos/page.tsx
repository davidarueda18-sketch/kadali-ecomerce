import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PackageCheck, Truck, ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrdersByEmail } from "@/lib/db/queries";
import { formatPrice } from "@/lib/format";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
import { PAYMENT_LABELS } from "@/lib/order-state";
import { orderDate, trackingLink } from "@/lib/order-display";
import { PAYMENT_TEST_PRODUCT_SLUG } from "@/lib/payment-config";
export const metadata = { title: "Mis compras | Kadali" };
export default async function PedidosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) redirect("/acceso?next=/cuenta/pedidos");
  const orders = await getOrdersByEmail(session.user.email);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">
          Tu cuenta
        </p>
        <h1 className="mt-2 font-heading text-4xl text-brand-deep">
          Mis compras
        </h1>
        <p className="mt-3 text-fg-muted">
          Tus productos, el estado de entrega y todo lo que necesitas para
          recibirlos.
        </p>
      </header>
      {!orders.length ? (
        <section className="rounded-3xl border border-line bg-surface px-6 py-14 text-center">
          <ShoppingBag className="mx-auto size-10 text-brand" />
          <h2 className="mt-5 font-heading text-2xl">
            Aquí comienza tu próxima pausa
          </h2>
          <p className="mt-3 text-fg-muted">
            Cuando completes una compra, encontrarás aquí sus detalles y
            seguimiento.
          </p>
          <Link
            href="/productos"
            className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white"
          >
            Explorar las velas
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const internal = order.items.every(
              (item) => item.productSlug === PAYMENT_TEST_PRODUCT_SLUG,
            );
            const shipping = !order.shippingRequired
              ? "Compra entregada · sin envío"
              : internal
                ? "Compra confirmada · sin despacho"
                : (SHIPPING_LABELS[order.fulfillmentStatus] ?? "Por preparar");
            const step = [
              "unfulfilled",
              "preparing",
              "shipped",
              "delivered",
            ].indexOf(order.fulfillmentStatus);
            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-petal-100/40 px-6 py-4">
                  <span className="flex items-center gap-2 font-semibold text-brand-deep">
                    {step >= 2 ? (
                      <Truck className="size-5" />
                    ) : (
                      <PackageCheck className="size-5" />
                    )}
                    {shipping}
                  </span>
                  <time
                    dateTime={order.createdAt.toISOString()}
                    className="text-sm text-fg-muted"
                  >
                    {orderDate(order.createdAt)}
                  </time>
                </header>
                <div className="space-y-5 p-6">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-bg">
                        <Image
                          src={cloudinaryUrl(item.imagePublicId, 200)}
                          alt={item.productName}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-heading text-lg font-semibold text-brand-deep">
                          {item.productName}
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">
                          {item.quantity}{" "}
                          {item.quantity === 1 ? "unidad" : "unidades"} ·{" "}
                          {formatPrice(item.unitPrice)} cada una
                        </p>
                      </div>
                      <p className="font-bold">{formatPrice(item.subtotal)}</p>
                    </div>
                  ))}
                  <p className="text-sm text-fg-muted">
                    Pago: {PAYMENT_LABELS[order.paymentStatus] ?? "Por revisar"}
                  </p>
                  {order.preparationRequired && (
                    <p className="rounded-xl bg-bg p-3 text-sm">
                      {order.preparationMessage}
                    </p>
                  )}
                  {!internal && order.shippingRequired && (
                    <>
                      <ol
                        aria-label="Progreso del envío"
                        className="grid grid-cols-4 gap-2 pt-3"
                      >
                        {[
                          "Confirmado",
                          "Preparando",
                          "En camino",
                          "Entregado",
                        ].map((label, index) => (
                          <li
                            key={label}
                            aria-current={index === step ? "step" : undefined}
                            className="text-center text-xs sm:text-sm"
                          >
                            <div
                              className={`mb-2 h-1.5 rounded-full ${index <= step ? "bg-brand" : "bg-line"}`}
                            />
                            <span
                              className={
                                index <= step
                                  ? "font-bold text-brand-deep"
                                  : "text-fg-muted"
                              }
                            >
                              {label}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <div className="rounded-2xl bg-bg p-4 text-sm">
                        <p className="font-semibold">Entrega en {order.city}</p>
                        <p className="mt-1 text-fg-muted">{order.address}</p>
                        {order.trackingNumber && (
                          <p className="mt-2">
                            {order.carrier} · Guía {order.trackingNumber}
                          </p>
                        )}
                        {trackingLink(order.trackingUrl) && (
                          <a
                            className="mt-3 inline-block font-bold text-brand"
                            href={trackingLink(order.trackingUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Seguir mi envío
                          </a>
                        )}
                      </div>
                    </>
                  )}
                  <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
                    <p className="text-xs text-fg-muted">
                      Referencia para soporte
                      <br />
                      {order.orderNumber}
                    </p>
                    <p className="text-right text-sm text-fg-muted">
                      Total pagado
                      <span className="ml-3 font-heading text-xl font-bold text-brand-deep">
                        {formatPrice(order.total)}
                      </span>
                    </p>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
