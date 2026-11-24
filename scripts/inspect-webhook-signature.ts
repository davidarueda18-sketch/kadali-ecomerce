import { readFileSync, existsSync } from 'node:fs'
import { parse } from 'dotenv'
import { inspectWebhookSignature } from '../lib/inspect-webhook-signature'

function argument(name: string) {
  const value = process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  if (!value) throw new Error(`Falta --${name}=valor del log de Vercel`)
  return value
}

try {
  const capture = {
    requestId: argument('request-id'), timestamp: argument('timestamp'), paymentId: argument('payment-id'),
    signatureFingerprint: argument('signature-fingerprint'),
  }
  if (!/^\d+$/.test(capture.timestamp) || !/^\d+$/.test(capture.paymentId) || !/^[a-f0-9]{64}$/.test(capture.signatureFingerprint)) {
    throw new Error('Timestamp, payment ID o signatureFingerprint invalido')
  }
  const candidates: { source: string; secret: string }[] = []
  for (const file of ['.env.production.local', '.env.development.local', '.env.local']) {
    if (!existsSync(file)) continue
    const secret = parse(readFileSync(file)).MP_WEBHOOK_SECRET?.trim()
    if (secret) candidates.push({ source: file, secret })
  }
  if (!candidates.length) throw new Error('No hay secretos locales para comparar')
  const matches = inspectWebhookSignature(capture, candidates)
  if (matches.length) {
    console.log('Coincidencias exactas de la firma recibida:')
    for (const match of matches) console.log(JSON.stringify(match))
  } else {
    console.log('La firma recibida no coincide con las claves y variantes comprobadas. Esto no identifica por si solo una falla del proveedor.')
    process.exitCode = 1
  }
  console.log('Analisis offline: no se aceptaron notificaciones ni se modificaron pagos o pedidos.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo analizar la firma')
  process.exitCode = 1
}
