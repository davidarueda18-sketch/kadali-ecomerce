import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { getCheckoutConfig } from '../lib/checkout-config'
import { createMercadoPagoWebhook } from '../lib/mercadopago-webhook'
import { reconcilePayment, type PaymentSnapshot, type ReconciliationOrder } from '../lib/payment-reconciliation'

const secret = 'webhook-secret-only-for-automated-tests'
const publicEnv = { MP_ACCESS_TOKEN: 'test-token', NEXT_PUBLIC_BASE_URL: 'https://www.kadalicandle.com', VERCEL_ENV: 'production' }

function signedRequest(options: { key?: string; timestamp?: number; id?: string } = {}) {
  const id = options.id ?? '12345'
  const timestamp = String(options.timestamp ?? Date.now())
  const requestId = 'test-notification'
  const signature = createHmac('sha256', options.key ?? secret)
    .update(`id:${id};request-id:${requestId};ts:${timestamp};`).digest('hex')
  return new Request(`https://www.kadalicandle.com/api/mercadopago/webhook?data.id=${id}&type=payment`, {
    method: 'POST', headers: { 'x-request-id': requestId, 'x-signature': `ts=${timestamp},v1=${signature}` },
    // An unsigned body cannot declare the payment approved; only the provider lookup can.
    body: JSON.stringify({ type: 'payment', data: { id }, status: 'approved' }),
  })
}

function fixture() {
  let order: ReconciliationOrder = { id: 1, orderNumber: 'KD-TEST', total: '2000.00', status: 'pending' }
  const payment: PaymentSnapshot = { id: 12345, external_reference: order.orderNumber, currency_id: 'COP', transaction_amount: 2000, status: 'approved', live_mode: true }
  let writes = 0
  let databaseUnavailable = false
  let providerUnavailable = false
  const reconcile = (id: string) => reconcilePayment(id, {
    fetchPayment: async () => {
      if (providerUnavailable) throw new Error('Provider unavailable')
      return { ...payment }
    },
    findOrder: async (number) => number === order.orderNumber ? { ...order } : undefined,
    updateStatus: async (observed, status) => {
      if (databaseUnavailable) throw new Error('Database unavailable')
      if (observed.status !== order.status) return false
      order = { ...order, status }
      writes++
      return true
    },
    requireLivePayment: true,
  })
  const handler = createMercadoPagoWebhook({ getSecret: () => secret, reconcile, log: () => {} })
  return {
    handler, reconcile, payment, get order() { return order }, get writes() { return writes },
    setDatabaseUnavailable(value: boolean) { databaseUnavailable = value },
    setProviderUnavailable(value: boolean) { providerUnavailable = value },
  }
}

test('public checkout refuses payment creation without webhook configuration', () => {
  assert.throws(() => getCheckoutConfig(publicEnv), { code: 'MISSING_MP_WEBHOOK_SECRET' })
  assert.throws(() => getCheckoutConfig({ ...publicEnv, MP_WEBHOOK_SECRET: '  ' }), { code: 'MISSING_MP_WEBHOOK_SECRET' })
})

test('production refuses localhost return URLs even with a webhook secret', () => {
  assert.throws(() => getCheckoutConfig({ ...publicEnv, MP_WEBHOOK_SECRET: secret, NEXT_PUBLIC_BASE_URL: 'http://localhost:3000' }), { code: 'INVALID_CHECKOUT_BASE_URL' })
})

test('configured public checkout has the canonical HTTPS origin', () => {
  assert.equal(getCheckoutConfig({ ...publicEnv, MP_WEBHOOK_SECRET: secret }).baseUrl, 'https://www.kadalicandle.com')
})

test('webhook confirms a pending order without any browser return', async () => {
  const f = fixture()
  const response = await f.handler(signedRequest())
  assert.equal(response.status, 200)
  assert.equal(f.order.status, 'paid')
  assert.equal(f.writes, 1)
})

test('a correctly signed timestamp in seconds confirms the order', async () => {
  const f = fixture()
  assert.equal((await f.handler(signedRequest({ timestamp: Math.floor(Date.now() / 1000) }))).status, 200)
  assert.equal(f.order.status, 'paid')
})

test('an expired seconds timestamp is rejected even when its HMAC is valid', async () => {
  const f = fixture()
  assert.equal((await f.handler(signedRequest({ timestamp: Math.floor(Date.now() / 1000) - 600 }))).status, 401)
  assert.equal(f.writes, 0)
})

test('redelivering the same webhook does not repeat the update', async () => {
  const f = fixture()
  await f.handler(signedRequest())
  assert.equal((await f.handler(signedRequest())).status, 200)
  assert.equal(f.order.status, 'paid')
  assert.equal(f.writes, 1)
})

test('a rejected payment attempt cannot cancel a paid order', async () => {
  const f = fixture()
  await f.handler(signedRequest())
  f.payment.status = 'rejected'
  assert.equal((await f.handler(signedRequest())).status, 200)
  assert.equal(f.order.status, 'paid')
})

test('a pending provider status is not approved by the webhook body', async () => {
  const f = fixture()
  f.payment.status = 'pending'
  assert.equal((await f.handler(signedRequest())).status, 200)
  assert.equal(f.order.status, 'pending')
  assert.equal(f.writes, 0)
})

for (const [field, value] of Object.entries({ currency_id: 'USD', transaction_amount: 1000, external_reference: 'KD-OTHER', live_mode: false, id: 99999 })) {
  test(`does not confirm a payment with an invalid ${field}`, async () => {
    const f = fixture()
    Object.assign(f.payment, { [field]: value })
    assert.equal((await f.handler(signedRequest())).status, 500)
    assert.equal(f.order.status, 'pending')
    assert.equal(f.writes, 0)
  })
}

test('bad or expired signature never changes an order', async () => {
  const f = fixture()
  assert.equal((await f.handler(signedRequest({ key: 'wrong-secret' }))).status, 401)
  assert.equal((await f.handler(signedRequest({ timestamp: Date.now() - 600_000 }))).status, 401)
  assert.equal(f.writes, 0)
})

test('rejected signatures are logged without credentials or reusable signatures', async () => {
  const logs: Record<string, unknown>[] = []
  const handler = createMercadoPagoWebhook({
    getSecret: () => secret,
    reconcile: async () => { throw new Error('Must not reconcile an invalid signature') },
    log: (_event, details) => logs.push(details),
  })
  const request = signedRequest({ key: 'wrong-secret' })
  const signature = request.headers.get('x-signature')!
  assert.equal((await handler(request)).status, 401)
  assert.equal(logs[0].reason, 'SignatureMismatch')
  assert.equal(logs[0].requestId, 'test-notification')
  assert.equal(logs[0].paymentId, '12345')
  assert.ok(!JSON.stringify(logs).includes(secret))
  assert.ok(!JSON.stringify(logs).includes(signature))
})

test('missing secret rejects notifications instead of acknowledging unprocessed payments', async () => {
  const f = fixture()
  const handler = createMercadoPagoWebhook({ getSecret: () => undefined, reconcile: f.reconcile, log: () => {} })
  assert.equal((await handler(signedRequest())).status, 503)
  assert.equal(f.writes, 0)
})

test('database failure is retryable and confirms the order after recovery', async () => {
  const f = fixture()
  f.setDatabaseUnavailable(true)
  assert.equal((await f.handler(signedRequest())).status, 500)
  assert.equal(f.order.status, 'pending')
  f.setDatabaseUnavailable(false)
  assert.equal((await f.handler(signedRequest())).status, 200)
  assert.equal(f.order.status, 'paid')
})

test('provider failure is retryable and confirms the order after recovery', async () => {
  const f = fixture()
  f.setProviderUnavailable(true)
  assert.equal((await f.handler(signedRequest())).status, 500)
  assert.equal(f.writes, 0)
  f.setProviderUnavailable(false)
  assert.equal((await f.handler(signedRequest())).status, 200)
  assert.equal(f.order.status, 'paid')
})
