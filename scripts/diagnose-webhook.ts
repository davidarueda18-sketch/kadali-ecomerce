import { config } from 'dotenv'
import { createHmac, randomUUID } from 'node:crypto'
import { WebhookSignatureValidator } from 'mercadopago'
import { createMercadoPagoWebhook } from '../lib/mercadopago-webhook'
import { webhookSecretFingerprint } from '../lib/webhook-diagnostics'

for (const path of ['.env.development.local', '.env.local', '.env.development', '.env']) {
  config({ path, quiet: true })
}

async function main() {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim()
  if (!secret) throw new Error('Falta MP_WEBHOOK_SECRET local')
  const target = new URL(process.argv.find(arg => arg.startsWith('--url='))?.slice(6)
    ?? 'https://www.kadalicandle.com/api/mercadopago/webhook')
  if (target.protocol !== 'https:' || target.pathname !== '/api/mercadopago/webhook' || target.username || target.password) {
    throw new Error('Usa la URL HTTPS publica del webhook')
  }
  // Match the remote clock to exclude local clock drift from the diagnosis.
  const clock = await fetch(target, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(15000) })
  const remoteTime = Date.parse(clock.headers.get('date') ?? '')
  const ts = String(Number.isFinite(remoteTime) ? remoteTime : Date.now())
  const requestId = randomUUID()
  const dataId = '123456'
  const signature = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')
  const xSignature = `ts=${ts},v1=${signature}`
  WebhookSignatureValidator.validate({ xSignature, xRequestId: requestId, dataId, secret })
  target.search = new URLSearchParams({ 'data.id': dataId, type: 'diagnostic' }).toString()
  const makeRequest = () => new Request(target, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': xSignature, 'x-request-id': requestId },
    body: JSON.stringify({ type: 'diagnostic' }),
  })
  const handler = createMercadoPagoWebhook({
    getSecret: () => secret,
    reconcile: async () => { throw new Error('Un diagnostico no debe conciliar pagos') },
    log: () => {},
  })
  const localResult = await handler(makeRequest())
  console.log('Huella local del secreto:', webhookSecretFingerprint(secret))
  console.log('Validacion con SDK y handler local:', localResult.status)
  if (localResult.status !== 200) throw new Error('Fallo de validacion local')
  const remote = await fetch(makeRequest(), { redirect: 'error', signal: AbortSignal.timeout(15000) })
  console.log('Request ID para buscar en Vercel:', requestId)
  console.log('Respuesta del despliegue:', remote.status)
  if (remote.status === 200) {
    const result = await remote.json()
    if (result.received !== true || result.ignored !== true) throw new Error('Respuesta inesperada del despliegue')
    console.log('OK: produccion acepta la firma del secreto local. Esto no valida aun la firma enviada por Mercado Pago.')
  } else {
    console.log('Busca el rechazo en Vercel y compara secretFingerprint, requestId y signatureTimestamp.')
    process.exitCode = 1
  }
  console.log('No se crearon ni modificaron pedidos; no se ejecuto ningun cobro.')
}

main().catch(error => {
  console.error(error instanceof Error && !('cause' in error) ? error.message : 'No se pudo completar el diagnostico HTTPS')
  process.exitCode = 1
})
