'use client'

import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  active?: boolean
  disabled?: boolean
  icon?: LucideIcon
  iconClassName?: string
  onClick?: () => void
  className?: string
}

export default function CategoryPill({
  label,
  active = false,
  disabled = false,
  icon: Icon,
  iconClassName = '',
  onClick,
  className = '',
}: Props) {
  const tone = disabled
    ? 'bg-surface/60 text-fg-muted cursor-not-allowed'
    : active
      ? 'bg-brand-deep text-surface'
      : 'bg-surface text-brand-deep shadow-sm hover:shadow-md'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors md:px-5 md:py-2 md:text-sm ${tone} ${className}`}
    >
      {Icon && <Icon className={`size-4 ${iconClassName}`} strokeWidth={1.75} />}
      {label}
    </button>
  )
}
