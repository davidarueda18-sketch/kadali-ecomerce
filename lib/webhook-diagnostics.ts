import { createHash } from 'node:crypto'

// This identifies a high-entropy secret without printing the secret or a usable signature.
export function webhookSecretFingerprint(secret: string) {
  return createHash('sha256').update(secret.trim()).digest('hex').slice(0, 16)
}

export function webhookSignatureDiagnostics(request: Request, secret: string) {
  const url = new URL(request.url)
  const signature = request.headers.get('x-signature')
  const timestamp = signature?.split(',').map(part => part.trim()).find(part => part.startsWith('ts='))?.slice(3)
  let receivedHash: string | undefined
  for (const part of signature?.split(',') ?? []) {
    const equals = part.indexOf('=')
    if (equals >= 0 && part.slice(0, equals).trim().toLowerCase() === 'v1') receivedHash = part.slice(equals + 1).trim()
  }
  return {
    secretFingerprint: webhookSecretFingerprint(secret),
    signaturePresent: Boolean(signature),
    signatureTimestamp: timestamp?.slice(0, 20),
    // A second hash permits offline comparisons without exposing a replayable HMAC.
    signatureFingerprint: receivedHash ? createHash('sha256').update(receivedHash).digest('hex') : undefined,
    requestId: request.headers.get('x-request-id'),
    paymentId: url.searchParams.get('data.id'),
    dataIdOccurrences: url.searchParams.getAll('data.id').length,
    queryParameterNames: [...url.searchParams.keys()],
  }
}
