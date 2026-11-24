import { createHash } from 'node:crypto'

// This identifies a high-entropy secret without printing the secret or a usable signature.
export function webhookSecretFingerprint(secret: string) {
  return createHash('sha256').update(secret.trim()).digest('hex').slice(0, 16)
}

export function webhookSignatureDiagnostics(request: Request, secret: string) {
  const url = new URL(request.url)
  const signature = request.headers.get('x-signature')
  const timestamp = signature?.split(',').map(part => part.trim()).find(part => part.startsWith('ts='))?.slice(3)
  return {
    secretFingerprint: webhookSecretFingerprint(secret),
    signaturePresent: Boolean(signature),
    signatureTimestamp: timestamp?.slice(0, 20),
    requestId: request.headers.get('x-request-id'),
    paymentId: url.searchParams.get('data.id'),
    dataIdOccurrences: url.searchParams.getAll('data.id').length,
    queryParameterNames: [...url.searchParams.keys()],
  }
}
