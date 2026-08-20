import { NextResponse } from 'next/server'
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from 'mercadopago'
import { reconcileMercadoPagoPayment } from '@/lib/mercado-pago'

export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error('Mercado Pago webhook rejected: MP_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 })
  }

  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id')
  const eventType = url.searchParams.get('type')

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId,
      secret,
      toleranceSeconds: 300,
    })
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    throw error
  }

  if (eventType && eventType !== 'payment') {
    return NextResponse.json({ received: true, ignored: true })
  }

  if (!dataId || !/^\d+$/.test(dataId)) {
    return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
  }

  try {
    const payment = await reconcileMercadoPagoPayment(dataId)
    return NextResponse.json({ received: true, orderStatus: payment.orderStatus })
  } catch (error) {
    console.error(
      'Mercado Pago webhook reconciliation failed:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ error: 'Payment reconciliation failed' }, { status: 500 })
  }
}
