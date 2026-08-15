'use client'

import { useState } from 'react'
import type { Player } from '@/lib/types'

interface Props {
  players: Player[]
  moderatorId: string
  votes: Record<string, boolean | string | null>
  phase: 'voting' | 'revealed'
  currentPlayerId: string
  onKick?: (playerId: string) => void
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
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

function PlayerRow({
  player, moderatorId, votes, phase, currentPlayerId, isModerator, onKick, pendingKick, setPendingKick,
}: {
  player: Player
  moderatorId: string
  votes: Record<string, boolean | string | null>
  phase: 'voting' | 'revealed'
  currentPlayerId: string
  isModerator: boolean
  onKick?: (id: string) => void
  pendingKick: string | null
  setPendingKick: (id: string | null) => void
}) {
  const vote = votes[player.id]
  const hasVoted = phase === 'voting' ? vote === true : vote !== null && vote !== undefined
  const voteValue = phase === 'revealed' ? (vote as string | null) : null

  return (
    <li className="player-item">
      <div className="player-item__avatar" style={{ background: avatarColor(player.id) }} title={player.name}>
        {initials(player.name)}
      </div>
      <div className="player-item__info">
        <span className="player-item__name">
          {player.name}
          {player.id === currentPlayerId && <span className="player-item__you"> (You)</span>}
        </span>
        {player.id === moderatorId && <span className="player-item__mod">mod</span>}
      </div>
      <div className="player-item__vote" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {player.isSpectator ? (
          <span className="vote-badge vote-badge--spectator">—</span>
        ) : phase === 'revealed' ? (
          <span className="vote-badge vote-badge--revealed">{voteValue ?? '—'}</span>
        ) : hasVoted ? (
          <span className="vote-badge vote-badge--voted">✓</span>
        ) : (
          <span className="vote-badge vote-badge--waiting">…</span>
        )}
        {isModerator && onKick && player.id !== currentPlayerId && (
          pendingKick === player.id ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="kick-btn kick-btn--confirm" onClick={() => { onKick(player.id); setPendingKick(null) }}>
                Remove
              </button>
              <button className="kick-btn" style={{ opacity: 1, color: 'var(--text-muted)' }} onClick={() => setPendingKick(null)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="kick-btn" onClick={() => setPendingKick(player.id)} title={`Remove ${player.name}`}>
              ✕
            </button>
          )
        )}
      </div>
    </li>
  )
}

export default function PlayerList({ players, moderatorId, votes, phase, currentPlayerId, onKick }: Props) {
  const isModerator = currentPlayerId === moderatorId
  const [pendingKick, setPendingKick] = useState<string | null>(null)

  const sort = (list: Player[]) => [
    ...list.filter((p) => p.id === currentPlayerId),
    ...list.filter((p) => p.id !== currentPlayerId),
  ]
  const voters = sort(players.filter((p) => !p.isSpectator))
  const spectators = sort(players.filter((p) => p.isSpectator))

  const rowProps = { moderatorId, votes, phase, currentPlayerId, isModerator, onKick, pendingKick, setPendingKick }

  return (
    <div className="player-list">
      <h3 className="player-list__title">
        Players <span className="player-list__count">{voters.length}</span>
      </h3>
      <ul className="player-list__items">
        {voters.map((player) => <PlayerRow key={player.id} player={player} {...rowProps} />)}
      </ul>

      {spectators.length > 0 && (
        <>
          <h3 className="player-list__title" style={{ marginTop: 16 }}>
            Spectators <span className="player-list__count">{spectators.length}</span>
          </h3>
          <ul className="player-list__items">
            {spectators.map((player) => <PlayerRow key={player.id} player={player} {...rowProps} />)}
          </ul>
        </>
      )}
    </div>
  )
}
