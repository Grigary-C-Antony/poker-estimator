'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

function capFirst(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
import { useParams, useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher-client'
import { CARD_SET } from '@/lib/types'
import type { CardValue, ClientRoom, RevealedRoom } from '@/lib/types'
import { getIdentity, saveIdentity } from '@/lib/identity'
import PokerCard from '@/components/PokerCard'
import PlayerList from '@/components/PlayerList'
import VoteResults from '@/components/VoteResults'
import PokerTable from '@/components/PokerTable'
import StoryHistory from '@/components/StoryHistory'
import ThemeToggle from '@/components/ThemeToggle'

type AnyRoom = ClientRoom | RevealedRoom

function isRevealed(room: AnyRoom): room is RevealedRoom {
  return room.phase === 'revealed'
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = (params.id as string).toUpperCase()

  const [room, setRoom] = useState<AnyRoom | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [storyDraft, setStoryDraft] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinNameInput, setJoinNameInput] = useState('')
  const [isSpectator, setIsSpectator] = useState(false)
  const [joiningModal, setJoiningModal] = useState(false)
  const [showNewRoundModal, setShowNewRoundModal] = useState(false)
  const [nextStoryInput, setNextStoryInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showFirstStoryModal, setShowFirstStoryModal] = useState(false)
  const [firstStoryInput, setFirstStoryInput] = useState('')
  const [savingFirstStory, setSavingFirstStory] = useState(false)
  const [mySelectedVote, setMySelectedVote] = useState<CardValue | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const storyTimer = useRef<NodeJS.Timeout | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  // Load session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(`poker_session_${roomId}`)
    if (raw) {
      try {
        const { playerId: pid, playerName: pname } = JSON.parse(raw)
        setPlayerId(pid)
        setPlayerName(pname)
      } catch {}
    }
  }, [roomId])

  // Fetch room state & set up Pusher
  useEffect(() => {
    let mounted = true

    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`)
        if (!res.ok) {
          setError('Room not found')
          setLoading(false)
          return
        }
        const data = await res.json()
        if (!mounted) return
        setRoom(data.room)
        setStoryDraft(data.room.currentStory)
        setLoading(false)

        // Restore persisted vote if still in same round
        const rawSession = localStorage.getItem(`poker_session_${roomId}`)
        if (rawSession && data.room.phase === 'voting') {
          const { playerId: pid } = JSON.parse(rawSession)
          const rawVote = localStorage.getItem(`poker_vote_${roomId}`)
          if (rawVote) {
            const { value, storyCount } = JSON.parse(rawVote)
            if (storyCount === data.room.storyCount && data.room.votes[pid] === true) {
              setMySelectedVote(value)
            }
          }
        }

        // Check if current player is in the room
        const raw = localStorage.getItem(`poker_session_${roomId}`)
        if (raw) {
          const { playerId: pid } = JSON.parse(raw)
          const inRoom = data.room.players.some((p: any) => p.id === pid)
          if (!inRoom) {
            const id = getIdentity()
            if (id?.playerName) setJoinNameInput(id.playerName)
            setShowJoinModal(true)
          } else if (
            pid === data.room.moderatorId &&
            data.room.storyCount === 0 &&
            !data.room.currentStory
          ) {
            // Brand new room — prompt moderator for first story
            setShowFirstStoryModal(true)
          }
        } else {
          const id = getIdentity()
          if (id?.playerName) setJoinNameInput(id.playerName)
          setShowJoinModal(true)
        }
      } catch {
        setError('Could not connect')
        setLoading(false)
      }
    }

    fetchRoom()

    // Subscribe to Pusher
    const pusher = getPusherClient()
    const channel = pusher.subscribe(`room-${roomId}`)

    channel.bind('room-updated', ({ room: updatedRoom }: { room: ClientRoom }) => {
      if (!mounted) return
      setRoom((prev) => {
        if (prev?.phase === 'revealed' && updatedRoom.phase === 'voting') {
          setMySelectedVote(null)
          localStorage.removeItem(`poker_vote_${roomId}`)
        }
        return updatedRoom
      })
      setStoryDraft(updatedRoom.currentStory)
    })

    channel.bind('votes-revealed', ({ room: revealedRoom }: { room: RevealedRoom }) => {
      if (!mounted) return
      setRoom(revealedRoom)
    })

    channel.bind('player-kicked', ({ playerId: kickedId }: { playerId: string }) => {
      if (!mounted) return
      const raw = localStorage.getItem(`poker_session_${roomId}`)
      if (raw) {
        const { playerId: myId } = JSON.parse(raw)
        if (myId === kickedId) {
          localStorage.removeItem(`poker_session_${roomId}`)
          router.push('/?kicked=1')
        }
      }
    })

    return () => {
      mounted = false
      channel.unbind_all()
      pusher.unsubscribe(`room-${roomId}`)
    }
  }, [roomId])

  async function handleJoinModal(e: React.FormEvent) {
    e.preventDefault()
    if (!joinNameInput.trim()) return
    setJoiningModal(true)

    const newId = playerId ?? getIdentity()?.playerId ?? crypto.randomUUID()

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: newId,
          playerName: joinNameInput.trim(),
          isSpectator,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const name = joinNameInput.trim()
      localStorage.setItem(`poker_session_${roomId}`, JSON.stringify({ playerId: newId, playerName: name }))
      saveIdentity(newId, name)
      setPlayerId(newId)
      setPlayerName(name)
      setRoom(data.room)
      setShowJoinModal(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setJoiningModal(false)
    }
  }

  async function handleVote(value: CardValue) {
    if (!playerId || !room) return
    if (room.phase === 'revealed') return

    setMySelectedVote(value)
    localStorage.setItem(`poker_vote_${roomId}`, JSON.stringify({ value, storyCount: room.storyCount }))
    await fetch(`/api/rooms/${roomId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, vote: value }),
    })
  }

  async function handleReveal() {
    if (!playerId) return
    await fetch(`/api/rooms/${roomId}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
  }

  // Sync countdown from room.timerEndsAt
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    const endsAt = room?.timerEndsAt ?? null
    if (!endsAt || room?.phase !== 'voting') { setSecondsLeft(null); return }
    const end = endsAt

    function tick() {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000))
      setSecondsLeft(s)
    }
    tick()
    countdownRef.current = setInterval(tick, 500)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [room?.timerEndsAt, room?.phase])

  // Auto-reveal when timer hits 0 (moderator's client only)
  useEffect(() => {
    if (secondsLeft === 0 && isModerator && room?.phase === 'voting') {
      handleReveal()
    }
  }, [secondsLeft])

  async function handleStartTimer(duration: number) {
    if (!playerId) return
    await fetch(`/api/rooms/${roomId}/timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, duration }),
    })
  }

  async function handleKick(targetId: string) {
    if (!playerId) return
    await fetch(`/api/rooms/${roomId}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderatorId: playerId, targetId }),
    })
  }

  async function handleRevote() {
    if (!playerId) return
    await fetch(`/api/rooms/${roomId}/revote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    setMySelectedVote(null)
  }

  async function handleReset(nextStory = '') {
    if (!playerId) return
    setResetting(true)
    await fetch(`/api/rooms/${roomId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, nextStory }),
    })
    setResetting(false)
  }

  async function handleFirstStorySubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = firstStoryInput.trim()
    if (!title || !playerId) return
    setSavingFirstStory(true)
    await fetch(`/api/rooms/${roomId}/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, story: title }),
    })
    setStoryDraft(title)
    setFirstStoryInput('')
    setSavingFirstStory(false)
    setShowFirstStoryModal(false)
  }

  async function handleNewRoundSubmit(e: React.FormEvent) {
    e.preventDefault()
    await handleReset(nextStoryInput.trim())
    setNextStoryInput('')
    setShowNewRoundModal(false)
  }

  function handleStoryChange(value: string) {
    setStoryDraft(value)
    if (storyTimer.current) clearTimeout(storyTimer.current)
    storyTimer.current = setTimeout(async () => {
      if (!playerId) return
      await fetch(`/api/rooms/${roomId}/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, story: value }),
      })
    }, 600)
  }

  async function handleLeave() {
    if (!playerId) { router.push('/'); return }
    await fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    localStorage.removeItem(`poker_session_${roomId}`)
    router.push('/')
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomId).then(() => showToast('Room code copied!'))
  }

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'))
  }

  // Derived state
  const isModerator = room?.moderatorId === playerId
  const currentPlayer = room?.players.find((p) => p.id === playerId)
  const isCurrentSpectator = currentPlayer?.isSpectator ?? false

  const myVote = !room || isRevealed(room)
    ? (room && isRevealed(room) ? (room.votes[playerId!] ?? null) : null)
    : (room.votes[playerId!] as boolean | undefined) ?? false

  if (loading) {
    return (
      <>
        <header className="app-header">
          <a href="/" className="app-logo">
            <div className="app-logo__icon">P</div>
            PointSprint
          </a>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64, color: 'var(--text-muted)' }}>
          Loading room…
        </div>
      </>
    )
  }

  if (error && !room) {
    return (
      <>
        <header className="app-header">
          <a href="/" className="app-logo">
            <div className="app-logo__icon">P</div>
            PointSprint
          </a>
        </header>
        <div className="not-found">
          <p style={{ fontSize: 32, margin: 0 }}>🂠</p>
          <h2 style={{ margin: 0, fontSize: 18 }}>Room not found</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            The room <code style={{ fontFamily: 'monospace' }}>{roomId}</code> doesn't exist or has expired.
          </p>
          <a href="/" className="btn btn--secondary btn--sm" style={{ marginTop: 8 }}>
            Back To Home
          </a>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Room header */}
      <header className="room-header">
        <a href="/" className="room-header__brand">PointSprint</a>

        <span style={{ flex: 1 }} />

        {/* Status pill */}
        {!isModerator && room?.phase === 'voting' ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600,
            color: mySelectedVote !== null ? 'var(--success)' : 'var(--text-secondary)',
            padding: '3px 10px', borderRadius: 20,
            border: '1px solid var(--border)', background: 'var(--bg)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: mySelectedVote !== null ? 'var(--success)' : '#F59E0B',
              animation: mySelectedVote === null ? 'pulse 1.8s ease-in-out infinite' : 'none',
            }} />
            {mySelectedVote !== null
              ? 'Vote submitted — you can change it until votes are revealed.'
              : 'Voting in progress — cast your vote now.'}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: room?.phase === 'voting' ? 'var(--text-secondary)' : 'var(--success)',
            fontWeight: 500, padding: '3px 10px', borderRadius: 20,
            border: '1px solid var(--border)', background: 'var(--bg)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: room?.phase === 'voting' ? '#F59E0B' : 'var(--success)',
              animation: room?.phase === 'voting' ? 'pulse 1.8s ease-in-out infinite' : 'none',
            }} />
            {room?.phase === 'voting' ? 'Voting in progress' : 'Votes revealed'}
          </span>
        )}

        <ThemeToggle />
        <button className="btn btn--danger btn--sm" onClick={() => setShowLeaveConfirm(true)}>
          Leave
        </button>
      </header>

      {/* Controls bar — moderator actions only */}
      {isModerator && (
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '8px 24px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', minHeight: 44 }}>
          {room?.phase === 'voting' && (
            <>
              {secondsLeft !== null && (
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                  color: secondsLeft <= 10 ? 'var(--error)' : 'var(--text-primary)',
                  minWidth: 36, textAlign: 'center',
                }}>
                  {secondsLeft}s
                </span>
              )}
              {secondsLeft === null ? (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={() => handleStartTimer(30)}>⏱ 30s</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => handleStartTimer(60)}>⏱ 60s</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => handleStartTimer(90)}>⏱ 90s</button>
                </>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => handleStartTimer(0)}>✕ Cancel</button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={handleRevote}>Reset Votes</button>
              <button className="btn btn--secondary btn--sm" onClick={handleReveal}>Reveal Votes</button>
            </>
          )}
          {room?.phase === 'revealed' && (
            <>
              <button className="btn btn--ghost btn--sm" onClick={handleRevote}>Re-vote</button>
              <button
                className="btn--new-round btn--new-round-active"
                onClick={() => { setNextStoryInput(''); setShowNewRoundModal(true) }}
              >
                ↺ New Round
              </button>
            </>
          )}
        </div>
      )}

      {/* Main room layout */}
      <div className="room-layout">
        <main className="room-main">

          {/* Active story */}
          <div className="story-banner">
            <span className="story-banner__label">Estimating</span>
            {isModerator ? (
              <input
                className="story-banner__input"
                type="text"
                placeholder="Story title (e.g. JIRA-1234)"
                value={storyDraft}
                onChange={(e) => handleStoryChange(capFirst(e.target.value))}
                maxLength={120}
              />
            ) : (
              <span className="story-banner__title">
                {storyDraft || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No story set</span>}
              </span>
            )}
          </div>

          {/* Revealed results */}
          {room?.phase === 'revealed' && isRevealed(room) && (
            <VoteResults players={room.players} votes={room.votes} />
          )}

          {/* Poker table — always visible */}
          {room && (
            <PokerTable
              players={room.players}
              votes={room.votes as Record<string, any>}
              phase={room.phase}
              currentPlayerId={playerId ?? ''}
            />
          )}

          {/* Voting cards */}
          {!isCurrentSpectator && (
            <div>
              <p className="cards-section__title">
                {room?.phase === 'revealed' ? 'Your vote was' : 'Pick your card'}
              </p>
              <div className="cards-grid">
                {CARD_SET.map((value) => {
                  const isSelected = isRevealed(room!)
                    ? (room as RevealedRoom).votes[playerId!] === value
                    : mySelectedVote === value

                  return (
                    <PokerCard
                      key={value}
                      value={value}
                      selected={isSelected}
                      disabled={room?.phase === 'revealed'}
                      onClick={() => handleVote(value)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Spectator empty state */}
          {isCurrentSpectator && room?.phase === 'voting' && (
            <div className="waiting-hint">
              <span className="waiting-hint__dot" />
              You&rsquo;re spectating — sit back while the team votes.
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="room-sidebar">
          {/* Invite section */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Invite
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="room-code__label">Code</span>
              <span className="room-code__value">{roomId}</span>
              <button className="copy-btn" onClick={copyRoomCode} title="Copy Code">⧉</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn--secondary btn--sm" style={{ flex: 1 }} onClick={copyRoomLink}>
                Copy Link
              </button>
            </div>
          </div>

          {room && (
            <PlayerList
              players={room.players}
              moderatorId={room.moderatorId}
              votes={room.votes as Record<string, any>}
              phase={room.phase}
              currentPlayerId={playerId ?? ''}
              onKick={isModerator ? handleKick : undefined}
            />
          )}

          {/* Story history */}
          {room && (room.stories?.length ?? 0) > 0 && (
            <StoryHistory stories={room.stories} />
          )}
        </aside>
      </div>

      {/* Join modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal__title">Join this room</h2>
            <p className="modal__sub">
              Room: <span className="modal__room-code">{roomId}</span> &mdash; {room?.name}
            </p>
            <form onSubmit={handleJoinModal}>
              <div className="form-group">
                <label className="form-label">Your name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Your name"
                  value={joinNameInput}
                  onChange={(e) => setJoinNameInput(e.target.value)}
                  maxLength={40}
                  autoFocus
                  required
                />
              </div>
              <label className="spectator-toggle">
                <input
                  type="checkbox"
                  checked={isSpectator}
                  onChange={(e) => setIsSpectator(e.target.checked)}
                />
                Join as spectator — watch only, spectators cannot vote
              </label>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={joiningModal || !joinNameInput.trim()}
              >
                {joiningModal ? 'Joining…' : 'Join Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* First story modal */}
      {showFirstStoryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal__title">Name your first story</h2>
            <p className="modal__sub">What are you estimating? A story name is required to start voting.</p>
            <form onSubmit={handleFirstStorySubmit}>
              <div className="form-group">
                <label className="form-label">Story title</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. JIRA-1234 User login"
                  value={firstStoryInput}
                  onChange={(e) => setFirstStoryInput(capFirst(e.target.value))}
                  maxLength={120}
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn--new-round-submit"
                style={{ width: '100%' }}
                disabled={savingFirstStory || !firstStoryInput.trim()}
              >
                {savingFirstStory ? 'Saving…' : 'Start Voting'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New round modal */}
      {showNewRoundModal && (
        <div className="modal-overlay" onClick={() => setShowNewRoundModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Start new round</h2>
            <p className="modal__sub">Name the next story to begin voting.</p>
            <form onSubmit={handleNewRoundSubmit}>
              <div className="form-group">
                <label className="form-label">Story title</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={`Story ${(room?.storyCount ?? 0) + 1}`}
                  value={nextStoryInput}
                  onChange={(e) => setNextStoryInput(capFirst(e.target.value))}
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowNewRoundModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--new-round-submit"
                  style={{ flex: 1 }}
                  disabled={resetting || !nextStoryInput.trim()}
                >
                  {resetting ? 'Starting…' : 'Start Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h2 className="modal__title">Leave room?</h2>
            <p className="modal__sub">
              {isModerator
                ? 'You are the moderator. Moderation will transfer to the next player.'
                : 'Your vote will be removed from the current round.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn--danger" style={{ flex: 1 }} onClick={handleLeave}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
