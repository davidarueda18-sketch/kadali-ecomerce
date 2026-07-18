'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useFilterParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Aplica varias claves en una sola escritura (evita que dos setParam
  // seguidos se pisen al reconstruirse desde un searchParams obsoleto).
  const setParams = useCallback(
    (entries: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(entries)) {
        params.delete(key)
        if (value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v))
          } else {
            params.set(key, value)
          }
        }
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setParam = useCallback(
    (key: string, value: string | string[] | null) => {
      setParams({ [key]: value })
    },
    [setParams]
  )

  return { searchParams, setParam, setParams }
}
