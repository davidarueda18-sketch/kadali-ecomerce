import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import AccesoForm from '@/ui/auth/acceso-form'

export const metadata: Metadata = {
  title: 'Acceder — Kadali',
}

export default function AccesoPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Marca en la esquina superior */}
      <Link href="/" className="absolute left-6 top-6">
        <Image src="/kadali-logo.svg" alt="Kadali" width={100} height={40} priority />
      </Link>

      <Suspense>
        <AccesoForm />
      </Suspense>
    </div>
  )
}
