import { Star } from 'lucide-react'

// Cosmetic only — the database has no ratings field.
// Derives a stable value in the 4.5–4.9 range from the product id.
function decorativeRating(id: number) {
  return (4.5 + (id % 5) * 0.1).toFixed(1)
}

type Props = { id: number; size?: 'sm' | 'md' }

export default function RatingBadge({ id, size = 'sm' }: Props) {
  const rating = decorativeRating(id)
  const textSize = size === 'md' ? 'text-sm' : 'text-xs'
  const iconSize = size === 'md' ? 'size-4' : 'size-3'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 ${textSize} font-medium text-fg shadow-sm`}
    >
      <Star className={`${iconSize} fill-yellow-400 text-yellow-400`} strokeWidth={0} />
      {rating}
    </span>
  )
}
