'use client'

import type { CardValue } from '@/lib/types'

interface Props {
  value: CardValue
  selected: boolean
  disabled: boolean
  onClick: () => void
}

export default function PokerCard({ value, selected, disabled, onClick }: Props) {
  const isSpecial = value === '?' || value === '☕'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'poker-card',
        selected ? 'poker-card--selected' : '',
        disabled && !selected ? 'poker-card--disabled' : '',
        isSpecial ? 'poker-card--special' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selected}
      aria-label={`Vote ${value}`}
    >
      <span className="poker-card__corner poker-card__corner--tl">{value}</span>
      <span className="poker-card__center">{value}</span>
      <span className="poker-card__corner poker-card__corner--br">{value}</span>
    </button>
  )
}
