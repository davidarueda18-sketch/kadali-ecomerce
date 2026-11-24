type CheckoutEnvironment = {
  [name: string]: string | undefined
  MP_ACCESS_TOKEN?: string
  MP_WEBHOOK_SECRET?: string
  NEXT_PUBLIC_BASE_URL?: string
  VERCEL_ENV?: string
}

export class CheckoutConfigurationError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'CheckoutConfigurationError'
  }
}

export function getCheckoutConfig(env: CheckoutEnvironment) {
  const accessToken = env.MP_ACCESS_TOKEN?.trim()
  if (!accessToken) throw new CheckoutConfigurationError('MISSING_MP_ACCESS_TOKEN')
  let url: URL
  try {
    url = new URL(env.NEXT_PUBLIC_BASE_URL?.trim() ?? '')
  } catch {
    throw new CheckoutConfigurationError('INVALID_CHECKOUT_BASE_URL')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const hasPublicHttpsUrl = url.protocol === 'https:' && !local
  if ((!hasPublicHttpsUrl && !(local && url.protocol === 'http:')) ||
      (env.VERCEL_ENV === 'production' && !hasPublicHttpsUrl) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new CheckoutConfigurationError('INVALID_CHECKOUT_BASE_URL')
  }
  // Never open a public checkout without the independent confirmation channel.
  if (hasPublicHttpsUrl && !env.MP_WEBHOOK_SECRET?.trim()) {
    throw new CheckoutConfigurationError('MISSING_MP_WEBHOOK_SECRET')
  }
  return { accessToken, baseUrl: url.origin, hasPublicHttpsUrl }
}
