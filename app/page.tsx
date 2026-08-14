'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function generatePlayerId() {
  return crypto.randomUUID()
}

export default function HomePage() {
  const router = useRouter()

  // Create room state
  const [roomName, setRoomName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join room state
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!roomName.trim() || !creatorName.trim()) return
    setCreating(true)
    setCreateError('')

    try {
      const moderatorId = generatePlayerId()
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomName.trim(),
          moderatorId,
          moderatorName: creatorName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create room')

      const roomId = data.room.id
      localStorage.setItem(
        `poker_session_${roomId}`,
        JSON.stringify({ playerId: moderatorId, playerName: creatorName.trim() })
      )
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      setCreateError(err.message)
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || !joinName.trim()) return
    setJoining(true)
    setJoinError('')

    try {
      // Check room exists first
      const check = await fetch(`/api/rooms/${code}`)
      if (!check.ok) {
        const d = await check.json()
        throw new Error(d.error ?? 'Room not found')
      }

      const playerId = generatePlayerId()
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName: joinName.trim(),
          isSpectator: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')

      const roomId = data.room.id
      localStorage.setItem(
        `poker_session_${roomId}`,
        JSON.stringify({ playerId, playerName: joinName.trim() })
      )
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      setJoinError(err.message)
      setJoining(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo__icon">P</div>
          PointSprint
        </div>
      </header>

      <main className="home-page">
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
          <div className="home-hero">
            <h1 className="home-hero__title">Planning poker, simplified.</h1>
            <p className="home-hero__sub">
              Create a room, invite your team, vote on stories — no login required.
            </p>
          </div>

          <div className="home-grid">
            {/* Create room */}
            <div className="home-panel">
              <p className="home-panel__eyebrow">New session</p>
              <h2 className="home-panel__title">Create a room</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Room name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Sprint 42 planning"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Your name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Jane Smith"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    maxLength={40}
                    required
                  />
                </div>
                {createError && (
                  <p style={{ color: 'var(--error)', fontSize: 12, margin: '0 0 12px' }}>
                    {createError}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={creating || !roomName.trim() || !creatorName.trim()}
                >
                  {creating ? 'Creating…' : 'Create room'}
                </button>
              </form>
            </div>

            {/* Join room */}
            <div className="home-panel">
              <p className="home-panel__eyebrow">Existing session</p>
              <h2 className="home-panel__title">Join a room</h2>
              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label className="form-label">Room code</label>
                  <input
                    className="form-input form-input--code"
                    type="text"
                    placeholder="AB3X7K"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Your name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="John Doe"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={40}
                    required
                  />
                </div>
                {joinError && (
                  <p style={{ color: 'var(--error)', fontSize: 12, margin: '0 0 12px' }}>
                    {joinError}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={joining || joinCode.length !== 6 || !joinName.trim()}
                >
                  {joining ? 'Joining…' : 'Join room'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
