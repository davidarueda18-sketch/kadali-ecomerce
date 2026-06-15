'use client'

import { useState } from 'react'

type Props = {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function FilterSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-line py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-fg"
      >
        {title}
        <span className="text-fg-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}
