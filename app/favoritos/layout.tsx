import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis favoritos | Kadali',
  description: 'Guarda y encuentra fácilmente tus velas favoritas de Kadali.',
}

export default function FavoritosLayout({ children }: { children: React.ReactNode }) {
  return children
}
