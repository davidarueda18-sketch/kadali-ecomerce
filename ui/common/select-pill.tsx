'use client'

import { ChevronDown } from 'lucide-react'

type Option = { value: string; label: string }

type Props = {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

export default function SelectPill({ label, value, options, onChange, className = '' }: Props) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-full border border-brand-deep/40 bg-surface py-2 pl-4 pr-10 text-sm font-medium text-brand-deep focus:border-brand-deep focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand-deep"
        strokeWidth={1.75}
      />
    </div>
  )
}
