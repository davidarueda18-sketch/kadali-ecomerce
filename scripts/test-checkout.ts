import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

const production = process.argv.includes('--production-build')
const environment = production ? 'production' : 'development'
for (const path of [`.env.${environment}.local`, '.env.local', `.env.${environment}`, '.env']) {
  config({ path, quiet: true })
}
neonConfig.webSocketConstructor = ws

async function main() {
  const baseUrl = 'http://localhost:3000'
  const page = await fetch(`${baseUrl}/checkout`)
  assert.equal(page.status, 200, 'El servidor local debe responder en el puerto 3000')
  const manifest = JSON.parse(await readFile(production
    ? '.next/server/server-reference-manifest.json'
    : '.next/dev/server/server-reference-manifest.json', 'utf8'))
  const action = Object.entries(manifest.node).find(([, entry]) =>
    (entry as { exportedName?: string }).exportedName === 'createOrder')
  assert.ok(action, 'No se encontro createOrder; compila /checkout primero')

  const form = {
    customerName: 'Diagnostico checkout local', customerEmail: 'checkout-test@example.invalid',
    customerPhone: '', address: 'Prueba interna', city: 'Bogota', zipCode: '',
  }
  async function submit(data: unknown, items: unknown) {
    const response = await fetch(`${baseUrl}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Next-Action': action![0], Origin: baseUrl },
      body: JSON.stringify([data, items]),
    })
    const body = await response.text()
    assert.equal(response.status, 200, 'La accion devolvio un error HTTP inesperado')
    const line = body.split('\n').find(line => line.startsWith('1:{') || line.startsWith('1:E'))
    assert.ok(line, 'No se encontro la respuesta de la accion')
    assert.ok(!line.startsWith('1:E'), 'La accion lanzo una excepcion sin controlar')
    return JSON.parse(line.slice(2))
  }

  const empty = await submit(form, [])
  assert.equal(empty.ok, false)
  assert.match(empty.error, /carrito está vacío/)
  console.log('OK carrito vacio: mensaje controlado, sin HTTP 500')
  const invalidEmail = await submit({ ...form, customerEmail: 'invalido' }, [])
  assert.equal(invalidEmail.ok, false)
  assert.match(invalidEmail.error, /correo electrónico válido/)
  console.log('OK correo invalido: rechazado en servidor')
  const invalidQuantity = await submit(form, [{ productId: 1, quantity: -1 }])
  assert.equal(invalidQuantity.ok, false)
  assert.match(invalidQuantity.error, /producto inválido/)
  console.log('OK cantidad negativa: rechazada en servidor')

  if (process.argv.includes('--create-order')) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
    try {
      const { rows } = await pool.query("select id from products where slug = 'prueba-pago' limit 1")
      assert.ok(rows[0], 'Falta el producto prueba-pago')
      const result = await submit(form, [{ productId: rows[0].id, quantity: 1 }])
      assert.equal(result.ok, true, `Checkout fallido: ${result.error ?? ''} ${result.reference ?? ''}`)
      assert.ok(result.initPoint.startsWith('https://'))
      const order = await pool.query('select o.status, o.total, count(i.id)::int as items from orders o join order_items i on i."orderId" = o.id where o."orderNumber" = $1 group by o.id', [result.orderNumber])
      assert.equal(order.rows[0]?.status, 'pending')
      assert.equal(Number(order.rows[0]?.total), 2000)
      assert.equal(order.rows[0]?.items, 1)
      console.log(`OK checkout completo: ${result.orderNumber}, pedido pendiente de 2000 COP y enlace de Mercado Pago. No se ejecuto ningun cobro.`)
    } finally {
      await pool.end()
    }
  }
}

main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : 'No se pudo ejecutar la prueba; revisa el servidor local y la configuracion')
  process.exitCode = 1
})
