'use client'

import type { Player, CardValue } from '@/lib/types'

interface Props {
  players: Player[]
  votes: Record<string, boolean | CardValue | null>
  phase: 'voting' | 'revealed'
  currentPlayerId: string
}

const AVATAR_COLORS = [
  '#2D3748', '#276749', '#744210', '#702459',
  '#1A365D', '#44337A', '#234E52', '#742A2A',
]

function avatarColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PokerTable({ players, votes, phase, currentPlayerId }: Props) {
  const voters = players.filter((p) => !p.isSpectator)
  const spectators = players.filter((p) => p.isSpectator)

  const votedCount = voters.filter((p) => {
    const v = votes[p.id]
    return phase === 'voting' ? v === true : v !== null && v !== undefined
  }).length

  const pct = voters.length > 0 ? votedCount / voters.length : 0
  const r = 16
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="poker-table">
      <div className="poker-table__header">
        <span className="poker-table__label">Table</span>
        {phase === 'voting' && voters.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r={r} fill="none"
                stroke={pct === 1 ? 'var(--success)' : 'var(--text-primary)'}
                strokeWidth="3"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
              <text
                x="20" y="20"
                textAnchor="middle" dominantBaseline="central"
                style={{ transform: 'rotate(90deg)', transformOrigin: '20px 20px', fontSize: 10, fontWeight: 700, fill: 'var(--text-primary)', fontFamily: 'inherit' }}
              >
                {votedCount}/{voters.length}
              </text>
            </svg>
            <span className="poker-table__progress-text">{votedCount} of {voters.length} voted</span>
          </span>
        )}
        {phase === 'revealed' && (
          <span className="poker-table__progress-text poker-table__progress-text--revealed">
            Votes revealed
          </span>
        )}
      </div>

      {voters.length === 0 ? (
        <p className="poker-table__empty">No players yet — share the room code to invite teammates.</p>
      ) : (
        <div className="poker-table__cards">
          {voters.map((player) => {
            const vote = votes[player.id]
            const hasVoted = phase === 'voting' ? vote === true : vote !== null && vote !== undefined
            const value = phase === 'revealed' ? (vote as CardValue | null) : null
            const isMe = player.id === currentPlayerId

            return (
              <div key={player.id} className={`table-slot ${isMe ? 'table-slot--me' : ''}`}>
                <div
                  className={[
                    'table-card',
                    hasVoted && phase === 'voting' ? 'table-card--voted' : '',
                    phase === 'revealed' ? 'table-card--revealed' : '',
                    !hasVoted && phase === 'voting' ? 'table-card--waiting' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {phase === 'revealed' ? (
                    <span className="table-card__value">{value ?? '—'}</span>
                  ) : hasVoted ? (
                    <span className="table-card__back">✓</span>
                  ) : (
                    <span className="table-card__dots">···</span>
                  )}
                </div>
                <div
                  className="table-slot__avatar"
                  style={{ background: avatarColor(player.id) }}
                  title={player.name}
                >
                  {initials(player.name)}
                </div>
                <span className="table-slot__name">
                  {isMe ? 'You' : player.name}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {spectators.length > 0 && (
        <div className="poker-table__spectators">
          <span className="spectator-label">Watching:</span>
          {spectators.map((p) => (
            <span key={p.id} className="spectator-chip">{p.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}
