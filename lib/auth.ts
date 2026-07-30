import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user, session, account, verification, orders } from '@/lib/db/schema'
import { sendOtpEmail } from '@/lib/email'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    transaction: true,
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días (se renueva sola si el usuario vuelve antes de que expire)
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
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
