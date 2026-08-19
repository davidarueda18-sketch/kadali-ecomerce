'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient, signIn } from '@/lib/auth-client'

type Step = 'email' | 'otp'

// Cuando Google falla, Better Auth redirige de vuelta acá con ?error=<código>
const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Cancelaste el acceso con Google.',
  signup_disabled: 'No pudimos crear tu cuenta con Google.',
  account_not_linked: 'Ese correo ya tiene cuenta con otro método. Entra con tu correo y código.',
}

export default function AccesoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackURL = searchParams.get('next') || '/'
  const oauthError = searchParams.get('error')

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    oauthError
      ? (OAUTH_ERRORS[oauthError] ?? 'No pudimos completar el acceso con Google. Intenta de nuevo.')
      : null,
  )

  async function handleGoogle() {
    setError(null)
    setLoadingGoogle(true)
    const { error } = await signIn.social({ provider: 'google', callbackURL })
    if (error) {
      setError(error.message ?? 'No pudimos iniciar con Google. Intenta de nuevo.')
      setLoadingGoogle(false)
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'No pudimos enviar el código. Revisa el correo e intenta de nuevo.')
      return
    }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn.emailOtp({ email, otp })
    if (error) {
      setLoading(false)
      setError(error.message ?? 'Código incorrecto o vencido.')
      return
    }
    router.push(callbackURL)
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-brand-deep">Bienvenido a Kadali</h1>
        <p className="mt-1 text-sm text-fg-muted">Inicia sesión para ver tus pedidos</p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loadingGoogle}
        className="inline-flex items-center justify-center gap-3 rounded-full border border-line bg-surface py-3 font-semibold text-fg shadow-sm transition hover:shadow-md disabled:opacity-50"
      >
        <GoogleIcon className="size-5" />
        {loadingGoogle ? 'Conectando…' : 'Continuar con Google'}
      </button>

      <div className="flex items-center gap-3 text-xs text-fg-muted">
        <span className="h-px flex-1 bg-line" />
        o con tu correo
        <span className="h-px flex-1 bg-line" />
      </div>

      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-deep py-3 font-semibold text-surface transition hover:bg-orchid-700 disabled:opacity-50"
          >
            {loading ? 'Enviando código…' : 'Enviar código'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">
            Enviamos un código de 6 dígitos a <strong className="text-fg">{email}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-center text-lg tracking-[0.5em] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="rounded-full bg-brand-deep py-3 font-semibold text-surface transition hover:bg-orchid-700 disabled:opacity-50"
          >
            {loading ? 'Verificando…' : 'Confirmar código'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp('')
              setError(null)
            }}
            className="text-sm text-fg-muted underline-offset-2 hover:underline"
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  )
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.84-.07-1.46-.22-2.11H12v3.83h6.6c-.13 1.06-.85 2.66-2.45 3.73l-.02.15 3.56 2.7.25.02c2.26-2.04 3.58-5.05 3.58-8.32Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.24 0 5.96-1.05 7.94-2.86l-3.79-2.87c-1.01.7-2.38 1.19-4.15 1.19-3.17 0-5.86-2.04-6.82-4.87l-.14.01-3.7 2.8-.05.13C3.25 20.86 7.27 23.5 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.18 14.09a6.9 6.9 0 0 1-.38-2.22c0-.77.14-1.52.37-2.22l-.01-.15-3.75-2.84-.12.06A11.15 11.15 0 0 0 .25 11.87c0 1.8.44 3.5 1.22 5l3.71-2.78Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c2.25 0 3.77.94 4.64 1.73l3.38-3.24C17.95 1.43 15.24.25 12 .25 7.27.25 3.25 2.89 1.22 6.87l3.7 2.8c.97-2.83 3.66-4.92 6.83-4.92Z"
      />
    </svg>
  )
}
