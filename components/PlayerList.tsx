'use client'

import type { Player } from '@/lib/types'

interface Props {
  players: Player[]
  moderatorId: string
  votes: Record<string, boolean | string | null>
  phase: 'voting' | 'revealed'
  currentPlayerId: string
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  '#2D3748', '#276749', '#744210', '#702459',
  '#1A365D', '#44337A', '#234E52', '#742A2A',
]

function avatarColor(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function PlayerList({ players, moderatorId, votes, phase, currentPlayerId }: Props) {
  return (
    <div className="player-list">
      <h3 className="player-list__title">
        Players <span className="player-list__count">{players.length}</span>
      </h3>
      <ul className="player-list__items">
        {players.map((player) => {
          const vote = votes[player.id]
          const hasVoted = phase === 'voting' ? vote === true : vote !== null && vote !== undefined
          const voteValue = phase === 'revealed' ? (vote as string | null) : null

          return (
            <li key={player.id} className="player-item">
              <div
                className="player-item__avatar"
                style={{ background: avatarColor(player.id) }}
                title={player.name}
              >
                {initials(player.name)}
              </div>
              <div className="player-item__info">
                <span className="player-item__name">
                  {player.name}
                  {player.id === currentPlayerId && (
                    <span className="player-item__you"> (you)</span>
                  )}
                </span>
                {player.isSpectator && (
                  <span className="player-item__spectator">spectator</span>
                )}
                {player.id === moderatorId && !player.isSpectator && (
                  <span className="player-item__mod">mod</span>
                )}
              </div>
              <div className="player-item__vote">
                {player.isSpectator ? (
                  <span className="vote-badge vote-badge--spectator">—</span>
                ) : phase === 'revealed' ? (
                  <span className={`vote-badge vote-badge--revealed`}>
                    {voteValue ?? '—'}
                  </span>
                ) : hasVoted ? (
                  <span className="vote-badge vote-badge--voted">✓</span>
                ) : (
                  <span className="vote-badge vote-badge--waiting">…</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
