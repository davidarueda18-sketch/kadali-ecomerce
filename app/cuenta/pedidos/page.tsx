import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getOrdersByEmail } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'Mis pedidos — Kadali',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default async function PedidosPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/acceso?next=/cuenta/pedidos')

  const orders = await getOrdersByEmail(session.user.email)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-2xl text-brand-deep">Mis pedidos</h1>

      {orders.length === 0 ? (
        <p className="mt-4 text-fg-muted">Todavía no tienes pedidos.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-deep">{order.orderNumber}</span>
                <span className="text-sm text-fg-muted">
                  {order.createdAt.toLocaleDateString('es-CO')}
                </span>
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                Estado: {STATUS_LABELS[order.status] ?? order.status}
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-fg">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.productName} x{item.quantity}
                    </span>
                    <span>${Number(item.subtotal).toLocaleString('es-CO')} COP</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right font-semibold text-brand-deep">
                Total: ${Number(order.total).toLocaleString('es-CO')} COP
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
