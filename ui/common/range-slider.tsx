'use client'

type Props = {
  min: number
  max: number
  step: number
  value: [number, number]
  onChange: (next: [number, number]) => void
  onChangeEnd?: (next: [number, number]) => void
  minLabel: string
  maxLabel: string
  formatValue?: (n: number) => string
  className?: string
}

export default function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  onChangeEnd,
  minLabel,
  maxLabel,
  formatValue,
  className = '',
}: Props) {
  const [lo, hi] = value
  const span = max - min || 1
  const loPct = ((lo - min) / span) * 100
  const hiPct = ((hi - min) / span) * 100

  function handleLo(raw: number) {
    onChange([Math.min(raw, hi - step), hi])
  }

  function handleHi(raw: number) {
    onChange([lo, Math.max(raw, lo + step)])
  }

  function commit() {
    onChangeEnd?.([lo, hi])
  }

  return (
    <div className={`relative flex h-6 items-center ${className}`}>
      {/* Track de fondo */}
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-petal-200" />
      {/* Segmento seleccionado */}
      <div
        className="pointer-events-none absolute h-1.5 rounded-full bg-brand"
        style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
      />

      <input
        type="range"
        className="range-input absolute inset-0 w-full"
        min={min}
        max={max}
        step={step}
        value={lo}
        aria-label={minLabel}
        aria-valuetext={formatValue?.(lo)}
        onChange={(e) => handleLo(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <input
        type="range"
        className="range-input absolute inset-0 w-full"
        min={min}
        max={max}
        step={step}
        value={hi}
        aria-label={maxLabel}
        aria-valuetext={formatValue?.(hi)}
        onChange={(e) => handleHi(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </div>
  )
}
