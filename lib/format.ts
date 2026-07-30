const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatPrice(price: string | number): string {
  return priceFormatter.format(Number(price))
}

// El login por OTP no pide nombre; usa la parte del correo antes del '@' como respaldo
export function displayName(user: { name?: string | null; email: string }): string {
  return user.name?.trim() || user.email.split('@')[0]
}
