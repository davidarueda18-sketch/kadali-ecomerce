const OTP_LABELS: Record<string, string> = {
  'sign-in': 'Tu código para iniciar sesión',
  'email-verification': 'Verifica tu correo',
  'forget-password': 'Recupera tu contraseña',
  'change-email': 'Confirma tu nuevo correo',
}

// "Nombre <correo@dominio.com>" -> { name, email } (formato esperado por la API de Brevo)
function parseSender(raw: string) {
  const match = raw.match(/^(.*)<(.+)>$/)
  if (!match) return { email: raw.trim() }
  return { name: match[1].trim(), email: match[2].trim() }
}

export async function sendOtpEmail(email: string, otp: string, type: string) {
  const subject = OTP_LABELS[type] ?? 'Tu código de verificación'

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: parseSender(process.env.EMAIL_FROM!),
      to: [{ email }],
      subject: `${subject} — Kadali`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F7F3EC;">
          <h1 style="color: #4A2B3F; font-size: 20px; margin-bottom: 8px;">Kadali</h1>
          <p style="color: #262019; font-size: 15px;">${subject}. Usa este código para continuar:</p>
          <div style="background: #FFFFFF; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #9E3F66;">${otp}</span>
          </div>
          <p style="color: #857E72; font-size: 13px;">Este código vence en 5 minutos. Si no lo solicitaste, ignora este correo.</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    throw new Error(`Brevo API error (${res.status}): ${await res.text()}`)
  }
}
