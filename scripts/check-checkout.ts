import { config } from 'dotenv'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import ws from 'ws'
import { CheckoutConfigurationError, getCheckoutConfig } from '../lib/checkout-config'

// Match next dev precedence; never print credential values.
for (const path of ['.env.development.local', '.env.local', '.env.development', '.env']) {
  config({ path, quiet: true })
}
neonConfig.webSocketConstructor = ws

async function main() {
  let failed = false
  for (const name of ['DATABASE_URL', 'MP_ACCESS_TOKEN', 'NEXT_PUBLIC_BASE_URL', 'BETTER_AUTH_SECRET']) {
    const present = Boolean(process.env[name]?.trim())
    console.log(`${present ? 'OK' : 'FAIL'} ${name}: ${present ? 'configurada' : 'ausente'}`)
    if (!present) failed = true
  }
  console.log(`${process.env.MP_WEBHOOK_SECRET ? 'OK' : 'WARN'} MP_WEBHOOK_SECRET: ${process.env.MP_WEBHOOK_SECRET ? 'configurada' : 'ausente; no se confirmaran pagos por webhook'}`)
  try {
    getCheckoutConfig(process.env)
    console.log('OK configuracion de checkout y URLs de retorno')
  } catch (error) {
    console.log(`FAIL configuracion: ${error instanceof CheckoutConfigurationError ? error.code : 'INVALID_CONFIGURATION'}`)
    failed = true
  }

  const webhookUrl = process.argv.find(arg => arg.startsWith('--webhook-url='))?.slice('--webhook-url='.length)
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl)
      if (url.protocol !== 'https:' || url.pathname !== '/api/mercadopago/webhook') throw new Error('Invalid webhook URL')
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'diagnostic-no-payment' }), signal: AbortSignal.timeout(15000), redirect: 'error',
      })
      if (response.status === 401) {
        console.log('OK endpoint publico: rechaza peticiones sin firma. Esto NO valida una entrega real ni que el secreto sea correcto.')
      } else {
        console.log(`FAIL endpoint publico: HTTP ${response.status}${response.status === 503 ? ' (webhook no configurado)' : ''}`)
        failed = true
      }
    } catch {
      console.log('FAIL endpoint publico: URL invalida, redireccion o conexion fallida')
      failed = true
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')
  let publicHttps = false
  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      publicHttps = url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      console.log(`OK URL de retorno: ${url.origin} (${publicHttps ? 'HTTPS publico' : 'local; webhook no accesible desde Mercado Pago'})`)
    } catch {
      console.log('FAIL NEXT_PUBLIC_BASE_URL: URL invalida')
      failed = true
    }
  }

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
    try {
      const { rows } = await pool.query("select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('orders', 'order_items', 'products')")
      const required: Record<string, string[]> = {
        orders: ['id', 'orderNumber', 'userId', 'customerName', 'customerEmail', 'customerPhone', 'address', 'city', 'zipCode', 'country', 'subtotal', 'shippingCost', 'total', 'status'],
        order_items: ['orderId', 'productId', 'productName', 'unitPrice', 'quantity', 'subtotal'],
        products: ['id', 'slug', 'name', 'price', 'stock', 'active'],
      }
      for (const [table, columns] of Object.entries(required)) {
        const missing = columns.filter(column => !rows.some(row => row.table_name === table && row.column_name === column))
        console.log(`${missing.length ? 'FAIL' : 'OK'} esquema ${table}${missing.length ? ': faltan ' + missing.join(', ') : ''}`)
        if (missing.length) failed = true
      }
      const product = await pool.query("select id, price, stock, active from products where slug = 'prueba-pago' limit 1")
      console.log(product.rows.length ? `OK producto prueba-pago: ${product.rows[0].price} COP, stock ${product.rows[0].stock}` : 'FAIL producto prueba-pago ausente')
      if (!product.rows.length) failed = true
    } catch (error) {
      const code = (error as { code?: string }).code
      console.log(`FAIL base de datos${code ? ': codigo ' + code : ' (conexion o consulta fallida)'}`)
      failed = true
    } finally {
      await pool.end()
    }
  }

  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        signal: AbortSignal.timeout(15000),
      })
      const account = await response.json()
      console.log(`${response.ok ? 'OK' : 'FAIL'} Mercado Pago /users/me: HTTP ${response.status}${response.ok ? ', pais ' + account.site_id + ', cuenta de prueba: ' + Boolean(account.tags?.includes('test_user')) : ''}`)
      if (!response.ok) failed = true
    } catch {
      console.log('FAIL conexion con Mercado Pago')
      failed = true
    }
  }

  // Optional: creates only a checkout link, never a payment or a database order.
  if (process.argv.includes('--create-preference') && process.env.MP_ACCESS_TOKEN && baseUrl && !failed) {
    try {
      const preference = new Preference(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }))
      const result = await preference.create({ body: {
        items: [{ id: 'diagnostico', title: 'Prueba de pago', quantity: 1, unit_price: 2000, currency_id: 'COP' }],
        external_reference: `CHECK-${Date.now()}`,
        back_urls: { success: `${baseUrl}/checkout/exito`, failure: `${baseUrl}/checkout`, pending: `${baseUrl}/checkout/exito` },
        ...(publicHttps ? { auto_return: 'approved', notification_url: `${baseUrl}/api/mercadopago/webhook` } : {}),
      } })
      console.log(`${result.init_point ? 'OK' : 'FAIL'} creacion de preferencia: ${result.init_point ? 'URL recibida; no se ejecuto ningun cobro' : 'sin URL'}`)
      if (!result.init_point) failed = true
    } catch (error) {
      const provider = error as { status?: number; error?: string; message?: string }
      // Provider errors only; do not dump request headers, tokens or payer data.
      console.log(`FAIL preferencia Mercado Pago: ${JSON.stringify({ status: provider.status, error: provider.error, message: provider.message })}`)
      failed = true
    }
  }
  if (failed) process.exitCode = 1
}

main().catch(() => { console.error('FAIL diagnostico inesperado'); process.exitCode = 1 })
