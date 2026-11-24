import { createHash, createHmac } from 'node:crypto'
import { webhookSecretFingerprint } from './webhook-diagnostics'

type Capture = { requestId: string; timestamp: string; paymentId: string; signatureFingerprint: string }
type CandidateSecret = { source: string; secret: string }

// Forensics only: this never authenticates a request, calls the API or updates an order.
export function inspectWebhookSignature(capture: Capture, secrets: CandidateSecret[]) {
  const manifests = [
    { label: 'documented-payment-id', value: `id:${capture.paymentId};request-id:${capture.requestId};ts:${capture.timestamp};` },
    { label: 'simulator-default-id-123456', value: `id:123456;request-id:${capture.requestId};ts:${capture.timestamp};` },
    { label: 'id-omitted', value: `request-id:${capture.requestId};ts:${capture.timestamp};` },
    { label: 'request-id-omitted', value: `id:${capture.paymentId};ts:${capture.timestamp};` },
  ]
  const matches: { source: string; secretFingerprint: string; manifest: string }[] = []
  for (const { source, secret } of secrets) {
    for (const manifest of manifests) {
      const hmac = createHmac('sha256', secret.trim()).update(manifest.value).digest('hex')
      const fingerprint = createHash('sha256').update(hmac).digest('hex')
      if (fingerprint === capture.signatureFingerprint) {
        matches.push({ source, secretFingerprint: webhookSecretFingerprint(secret), manifest: manifest.label })
      }
    }
  }
  return matches
}
