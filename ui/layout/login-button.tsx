import { ArrowUpRight, User } from 'lucide-react'

type Props = {
  user?: { name: string } | null
  className?: string
}

export default function LoginButton({ user = null, className = '' }: Props) {
  return (
    <button
      type="button"
      aria-label={user ? user.name : 'Regístrate'}
      className={`inline-flex items-center gap-2.5 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-sm transition hover:shadow-md ${className}`}
    >
      <span className="text-sm font-semibold text-brand-deep">
        {user ? user.name : 'Regístrate'}
      </span>
      {user ? (
        <span className="grid size-8 place-items-center rounded-full bg-bg-alt text-brand-deep">
          <User className="size-4" strokeWidth={1.75} />
        </span>
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-brand-deep text-surface">
          <ArrowUpRight className="size-4" strokeWidth={1.75} />
        </span>
      )}
    </button>
  )
}
