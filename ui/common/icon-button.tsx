'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type Variant = 'plain' | 'raised' | 'solid' | 'overlay'
type Size = 'sm' | 'md'

type Props = {
  icon: LucideIcon
  label: string
  variant?: Variant
  size?: Size
  badge?: number
  href?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  iconClassName?: string
  'aria-expanded'?: boolean
}

const VARIANTS: Record<Variant, string> = {
  plain: 'text-brand-deep hover:bg-surface/70',
  raised: 'bg-surface text-brand-deep shadow-sm hover:shadow-md',
  solid: 'bg-brand-deep text-surface hover:bg-orchid-700',
  overlay: 'bg-surface/30 text-surface backdrop-blur-sm hover:bg-surface/40',
}

const SIZES: Record<Size, { box: string; icon: string }> = {
  sm: { box: 'size-9', icon: 'size-4' },
  md: { box: 'size-11', icon: 'size-5' },
}

export default function IconButton({
  icon: Icon,
  label,
  variant = 'raised',
  size = 'md',
  badge,
  href,
  onClick,
  disabled,
  className = '',
  iconClassName = '',
  'aria-expanded': ariaExpanded,
}: Props) {
  const dims = SIZES[size]
  const classes = `relative inline-flex items-center justify-center rounded-full transition ${
    dims.box
  } ${VARIANTS[variant]} ${disabled ? 'pointer-events-none opacity-40' : ''} ${className}`

  const content = (
    <>
      <Icon className={`${dims.icon} ${iconClassName}`} strokeWidth={1.75} />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-strong px-1 text-[10px] font-semibold text-surface">
          {badge}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {content}
    </button>
  )
}
