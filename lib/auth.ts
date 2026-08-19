import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user, session, account, verification, rateLimit, orders } from '@/lib/db/schema'
import { sendOtpEmail } from '@/lib/email'

// En prod tiene que ser el dominio público con https: de aquí sale el redirect_uri
// que se le manda a Google y el origen que se acepta en los callbackURL.
const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    transaction: true,
    schema: { user, session, account, verification, rateLimit },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días (se renueva sola si el usuario vuelve antes de que expire)
    // Evita ir a la BD en cada request: la sesión viaja firmada en una cookie
    // corta y solo se revalida contra Postgres cada 5 minutos.
    cookieCache: { enabled: true, maxAge: 300 },
  },
  // Sin esto, en producción un fallo de OAuth manda al usuario a "/" sin explicación.
  onAPIError: { errorURL: '/acceso' },
  rateLimit: {
    storage: 'database',
    // Pedir un OTP dispara un correo (con costo); se limita más duro que el resto.
    customRules: {
      '/email-otp/send-verification-otp': { window: 60, max: 3 },
      '/sign-in/email-otp': { window: 60, max: 10 },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: 'hashed', // el código no queda en claro en la tabla `verification`
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type)
      },
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        // El login por OTP no pide nombre; usa la parte del correo antes del '@' por defecto
        async before(newUser) {
          if (newUser.name) return
          return { data: { ...newUser, name: newUser.email.split('@')[0] } }
        },
        // Vincula al usuario nuevo con los pedidos que hizo como invitado usando el mismo correo
        async after(newUser) {
          await db
            .update(orders)
            .set({ userId: newUser.id })
            .where(and(eq(orders.customerEmail, newUser.email), isNull(orders.userId)))
        },
      },
    },
  },
})
