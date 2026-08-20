'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { createOrder, type CheckoutForm } from '@/app/actions/checkout'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { PAYMENT_TEST_PRODUCT_SLUG } from '@/lib/payment-config'
import { resolveProductHeroImage } from '@/lib/product-hero-images'

const inputClassName =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-fg outline-none transition placeholder:text-fg-muted/60 hover:border-orchid-300 focus:border-brand focus:ring-4 focus:ring-petal-100'

const labelClassName = 'mb-2 block text-sm font-semibold text-fg'

export default function CheckoutPage() {
  const { items, isReady, getTotal } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPaymentTest = items.length === 1 && items[0]?.slug === PAYMENT_TEST_PRODUCT_SLUG

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const form: CheckoutForm = {
      customerName: String(formData.get('customerName')).trim(),
      customerEmail: String(formData.get('customerEmail')).trim(),
      customerPhone: String(formData.get('customerPhone')).trim(),
      address: String(formData.get('address')).trim(),
      city: String(formData.get('city')).trim(),
      zipCode: String(formData.get('zipCode')).trim(),
    }

    try {
      const { initPoint } = await createOrder(form, items)
      window.location.assign(initPoint)
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'No pudimos iniciar el pago. Inténtalo nuevamente.'
      )
      setLoading(false)
    }
  }

  if (!isReady) {
    return <CheckoutSkeleton />
  }

  if (items.length === 0) {
    return <EmptyCheckout />
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div
        className="pointer-events-none absolute -left-32 top-16 -z-10 size-72 rounded-full bg-petal-200/55 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-36 top-1/3 -z-10 size-80 rounded-full bg-matcha-200/40 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-10 lg:pb-24">
        <header className="mb-8 lg:mb-10">
          <Link
            href="/carrito"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-fg-muted transition-colors hover:text-brand-deep"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al carrito
          </Link>

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Último paso
              </p>
              <h1 className="font-heading text-3xl font-semibold leading-tight text-fg sm:text-4xl">
                Finaliza tu compra
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
                Completa tus datos y te llevaremos a Mercado Pago para terminar la transacción.
              </p>
            </div>

            <CheckoutSteps />
          </div>
        </header>

        {isPaymentTest && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sienna/25 bg-sienna/10 px-4 py-3.5 text-sm text-fg sm:px-5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-sienna shadow-sm">
              <FlaskConical className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-bold">Checkout interno de validación</p>
              <p className="mt-0.5 leading-relaxed text-fg-muted">
                Estás por iniciar un cobro de {formatPrice(getTotal())}. La pantalla de resultado
                confirmará si Mercado Pago lo procesó en modo real o de prueba.
              </p>
            </div>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-8">
          <form
            id="checkout-form"
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_20px_60px_rgba(74,43,63,0.08)]"
          >
            <FormSection
              number="01"
              icon={UserRound}
              title="Información de contacto"
              description="Usaremos estos datos para identificar tu pedido y enviarte sus novedades."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre completo" htmlFor="customerName" className="sm:col-span-2">
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                      aria-hidden
                    />
                    <input
                      id="customerName"
                      name="customerName"
                      autoComplete="name"
                      placeholder="Tu nombre y apellido"
                      maxLength={255}
                      required
                      className={`${inputClassName} pl-11`}
                    />
                  </div>
                </Field>

                <Field label="Correo electrónico" htmlFor="customerEmail">
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                      aria-hidden
                    />
                    <input
                      id="customerEmail"
                      name="customerEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                      maxLength={255}
                      required
                      className={`${inputClassName} pl-11`}
                    />
                  </div>
                </Field>

                <Field label="Teléfono" htmlFor="customerPhone" optional>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                      aria-hidden
                    />
                    <input
                      id="customerPhone"
                      name="customerPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="300 000 0000"
                      maxLength={20}
                      className={`${inputClassName} pl-11`}
                    />
                  </div>
                </Field>
              </div>
            </FormSection>

            <div className="h-px bg-line" />

            <FormSection
              number="02"
              icon={MapPin}
              title={isPaymentTest ? 'Datos de referencia' : 'Dirección de entrega'}
              description={
                isPaymentTest
                  ? 'Este producto no genera despacho; guardaremos una referencia interna para la orden.'
                  : 'Indícanos dónde quieres recibir tu pedido. El envío está incluido.'
              }
            >
              {isPaymentTest ? (
                <div className="flex items-start gap-3 rounded-2xl bg-bg px-4 py-4 text-sm text-fg-muted">
                  <PackageCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <p className="leading-relaxed">
                    No necesitas completar una dirección para esta prueba. Usaremos “Prueba interna”
                    como referencia y no se generará ningún envío.
                  </p>
                  <input type="hidden" name="address" value="Prueba interna" />
                  <input type="hidden" name="city" value="Bogotá" />
                  <input type="hidden" name="zipCode" value="" />
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Dirección" htmlFor="address" className="sm:col-span-2">
                    <input
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      placeholder="Calle, carrera, número, apartamento"
                      maxLength={500}
                      required
                      className={inputClassName}
                    />
                  </Field>

                  <Field label="Ciudad" htmlFor="city">
                    <input
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      placeholder="Bogotá"
                      maxLength={100}
                      required
                      className={inputClassName}
                    />
                  </Field>

                  <Field label="Código postal" htmlFor="zipCode" optional>
                    <input
                      id="zipCode"
                      name="zipCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="110111"
                      maxLength={10}
                      className={inputClassName}
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {error && (
              <div
                role="alert"
                className="mx-5 mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 sm:mx-8"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-bold">No pudimos iniciar el pago</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </form>

          <aside className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_20px_60px_rgba(74,43,63,0.08)]">
              <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="size-5 text-brand-deep" aria-hidden />
                  <h2 className="font-heading text-lg font-semibold text-fg">Tu pedido</h2>
                </div>
                <Link
                  href="/carrito"
                  className="text-xs font-bold text-brand transition-colors hover:text-brand-deep"
                >
                  Editar
                </Link>
              </div>

              <ul className="max-h-72 divide-y divide-line overflow-y-auto px-5 sm:px-6">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3 py-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-bg-alt">
                      <Image
                        src={cloudinaryUrl(
                          resolveProductHeroImage(item.slug, item.imagePublicId),
                          160
                        )}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand-deep text-[10px] font-bold text-white shadow">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-sm font-bold text-fg">{item.name}</p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="self-center text-sm font-bold text-fg">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line bg-bg/55 px-5 py-5 sm:px-6">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between text-fg-muted">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold text-fg">{formatPrice(getTotal())}</dd>
                  </div>
                  <div className="flex justify-between text-fg-muted">
                    <dt>Envío</dt>
                    <dd className="font-bold text-matcha-600">
                      {isPaymentTest ? 'No aplica' : 'Gratis'}
                    </dd>
                  </div>
                  <div className="h-px bg-line" />
                  <div className="flex items-end justify-between pt-1">
                    <dt className="font-bold text-fg">Total</dt>
                    <dd className="text-right">
                      <span className="block text-xs text-fg-muted">COP</span>
                      <span className="font-heading text-2xl font-semibold text-brand-deep">
                        {formatPrice(getTotal())}
                      </span>
                    </dd>
                  </div>
                </dl>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading}
                  aria-busy={loading}
                  className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-strong px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(158,63,102,0.25)] transition hover:-translate-y-0.5 hover:bg-orchid-700 hover:shadow-[0_14px_28px_rgba(158,63,102,0.3)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      Preparando pago seguro…
                    </>
                  ) : (
                    <>
                      Pagar con Mercado Pago
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  <p>
                    Serás redirigido a Mercado Pago. Kadali no almacena los datos de tu tarjeta.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <TrustCard icon={ShieldCheck} label="Pago verificado" />
              <TrustCard
                icon={isPaymentTest ? CreditCard : Truck}
                label={isPaymentTest ? 'Monto controlado' : 'Envío incluido'}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function CheckoutSteps() {
  return (
    <ol className="flex max-w-md items-center" aria-label="Progreso del checkout">
      <li className="flex items-center">
        <span className="flex size-8 items-center justify-center rounded-full bg-matcha-500 text-white">
          <Check className="size-4" aria-hidden />
        </span>
        <span className="ml-2 hidden text-xs font-bold text-fg-muted sm:block">Carrito</span>
      </li>
      <li className="mx-2 h-px w-7 bg-matcha-300 sm:w-10" aria-hidden />
      <li className="flex items-center" aria-current="step">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
          2
        </span>
        <span className="ml-2 hidden text-xs font-bold text-fg sm:block">Tus datos</span>
      </li>
      <li className="mx-2 h-px w-7 bg-line sm:w-10" aria-hidden />
      <li className="flex items-center">
        <span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold text-fg-muted">
          3
        </span>
        <span className="ml-2 hidden text-xs font-bold text-fg-muted sm:block">Mercado Pago</span>
      </li>
    </ol>
  )
}

type FormSectionProps = {
  number: string
  icon: typeof UserRound
  title: string
  description: string
  children: React.ReactNode
}

function FormSection({ number, icon: Icon, title, description, children }: FormSectionProps) {
  return (
    <section className="p-5 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-petal-100 text-brand-deep">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">Paso {number}</p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-fg">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-fg-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, optional, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClassName}>
        {label}
        {optional && <span className="ml-1 font-normal text-fg-muted">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

function TrustCard({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/75 px-3 py-3 text-xs font-bold text-fg-muted backdrop-blur-sm">
      <Icon className="size-4 shrink-0 text-accent" aria-hidden />
      {label}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl animate-pulse px-5 py-10 sm:px-8 lg:px-10">
      <div className="h-4 w-28 rounded-full bg-line" />
      <div className="mt-8 h-10 w-72 max-w-full rounded-xl bg-line" />
      <div className="mt-4 h-4 w-96 max-w-full rounded-full bg-line" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="h-[560px] rounded-[1.75rem] bg-surface" />
        <div className="h-[430px] rounded-[1.75rem] bg-surface" />
      </div>
    </main>
  )
}

function EmptyCheckout() {
  return (
    <main className="mx-auto flex min-h-[68vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-petal-100 text-brand-deep">
        <ShoppingBag className="size-8" aria-hidden />
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand">Checkout</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold text-fg">Tu carrito está vacío</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
        Agrega una vela a tu carrito para continuar con la compra.
      </p>
      <Link
        href="/productos"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-strong px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orchid-700"
      >
        Explorar productos
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </main>
  )
}
