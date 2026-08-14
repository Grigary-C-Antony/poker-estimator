'use client'

import type { Player, CardValue } from '@/lib/types'

interface Props {
  players: Player[]
  votes: Record<string, CardValue | null>
}

function isNumeric(v: string) {
  return /^\d+$/.test(v)
}

export default function VoteResults({ players, votes }: Props) {
  const voterIds = players.filter((p) => !p.isSpectator).map((p) => p.id)
  const castVotes = voterIds
    .map((id) => votes[id])
    .filter((v): v is CardValue => v !== null && v !== undefined)

  const numericVotes = castVotes.filter(isNumeric).map(Number)
  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : null

  // Group votes
  const tally: Record<string, number> = {}
  for (const v of castVotes) {
    tally[v] = (tally[v] ?? 0) + 1
  }
  const sortedEntries = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const maxCount = sortedEntries[0]?.[1] ?? 0

  const isConsensus = Object.keys(tally).length === 1 && castVotes.length === voterIds.length
  const range =
    numericVotes.length >= 2
      ? `${Math.min(...numericVotes)} – ${Math.max(...numericVotes)}`
      : null

  return (
    <div className="vote-results">
      <div className="vote-results__header">
        <h3 className="vote-results__title">Results</h3>
        {isConsensus ? (
          <span className="consensus-badge consensus-badge--yes">Consensus</span>
        ) : (
          <span className="consensus-badge consensus-badge--no">No consensus</span>
        )}
      </div>

      <div className="vote-results__stats">
        {average !== null && (
          <div className="stat-box">
            <span className="stat-box__label">Average</span>
            <span className="stat-box__value">{average % 1 === 0 ? average : average.toFixed(1)}</span>
          </div>
        )}
        {range && (
          <div className="stat-box">
            <span className="stat-box__label">Range</span>
            <span className="stat-box__value">{range}</span>
          </div>
        )}
        <div className="stat-box">
          <span className="stat-box__label">Votes</span>
          <span className="stat-box__value">{castVotes.length}</span>
        </div>
      </div>

      <div className="vote-results__distribution">
        {sortedEntries.map(([value, count]) => (
          <div key={value} className="dist-row">
            <div className="dist-row__bar-wrap">
              <div
                className="dist-row__bar"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="dist-row__value">{value}</span>
            <span className="dist-row__count">{count}×</span>
          </div>
        ))}
      </div>

      <div className="vote-results__individual">
        {players
          .filter((p) => !p.isSpectator)
          .map((player) => {
            const vote = votes[player.id]
            return (
              <div key={player.id} className="individual-vote">
                <span className="individual-vote__name">{player.name}</span>
                <span className={`individual-vote__card ${vote === null ? 'individual-vote__card--empty' : ''}`}>
                  {vote ?? '—'}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
