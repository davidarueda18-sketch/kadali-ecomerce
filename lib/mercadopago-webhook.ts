import { InvalidWebhookSignatureError, SignatureFailureReason, WebhookSignatureValidator } from 'mercadopago'
import { webhookSignatureDiagnostics } from './webhook-diagnostics'

type Dependencies = {
  getSecret: () => string | undefined
  reconcile: (paymentId: string) => Promise<{ orderStatus: string }>
  log: (event: string, details: Record<string, unknown>) => void
}

function validateSignature(request: Request, dataId: string | null, secret: string) {
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  // Verify the HMAC against the ORIGINAL timestamp. The SDK's installed version
  // assumes milliseconds for freshness, while provider notifications may use seconds.
  WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret })
  let timestamp: string | undefined
  for (const part of xSignature!.split(',')) {
    const equals = part.indexOf('=')
    if (equals >= 0 && part.slice(0, equals).trim().toLowerCase() === 'ts') {
      timestamp = part.slice(equals + 1).trim()
    }
  }
  const numericTimestamp = Number(timestamp)
  const timestampMs = numericTimestamp < 1_000_000_000_000 ? numericTimestamp * 1000 : numericTimestamp
  if (!Number.isSafeInteger(numericTimestamp) || Math.abs(Date.now() - timestampMs) > 300_000) {
    throw new InvalidWebhookSignatureError(SignatureFailureReason.TimestampOutOfTolerance, xRequestId ?? undefined, timestamp)
  }
}

export function createMercadoPagoWebhook({ getSecret, reconcile, log }: Dependencies) {
  return async function POST(request: Request) {
    const requestId = request.headers.get('x-request-id')
    const secret = getSecret()?.trim()
    if (!secret) {
      log('Mercado Pago webhook unavailable', { requestId, code: 'MISSING_MP_WEBHOOK_SECRET' })
      return Response.json({ error: 'Webhook is not configured' }, { status: 503 })
    }
    const url = new URL(request.url)
    const dataId = url.searchParams.get('data.id')
    const eventType = url.searchParams.get('type')
    try {
      validateSignature(request, dataId, secret)
    } catch (error) {
      log('Mercado Pago webhook rejected', {
        ...webhookSignatureDiagnostics(request, secret),
        reason: error instanceof InvalidWebhookSignatureError ? error.reason : 'VALIDATION_ERROR',
      })
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
    if (eventType && eventType !== 'payment') {
      return Response.json({ received: true, ignored: true })
    }
    if (!dataId || !/^\d+$/.test(dataId)) {
      return Response.json({ error: 'Invalid payment ID' }, { status: 400 })
    }
    try {
      const result = await reconcile(dataId)
      log('Mercado Pago webhook reconciled', { requestId, paymentId: dataId, orderStatus: result.orderStatus })
      return Response.json({ received: true, orderStatus: result.orderStatus })
    } catch (error) {
      const failure = error as { code?: string; cause?: { code?: string }; status?: number }
      log('Mercado Pago webhook reconciliation failed', {
        requestId, paymentId: dataId, code: failure?.cause?.code ?? failure?.code, status: failure?.status,
        reason: failure?.cause ? 'DATABASE_ERROR' : error instanceof Error ? error.message : 'PAYMENT_API_ERROR',
      })
      // Acknowledge only after committing the order, so the provider can retry failures.
      return Response.json({ error: 'Payment reconciliation failed' }, { status: 500 })
    }
  }
}
