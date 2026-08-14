import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'
import type { CardValue, StoryRecord } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const { playerId, nextStory = '' } = await req.json()
    if (playerId !== room.moderatorId) {
      return NextResponse.json({ error: 'Only the moderator can reset' }, { status: 403 })
    }

    // Archive the completed round
    const voters = room.players.filter((p) => !p.isSpectator)
    const castVotes = voters
      .map((p) => room.votes[p.id])
      .filter((v): v is CardValue => v !== null && v !== undefined)

    const numericVotes = castVotes.filter((v) => /^\d+$/.test(v)).map(Number)
    const average =
      numericVotes.length > 0
        ? (() => {
            const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
            return avg % 1 === 0 ? String(avg) : avg.toFixed(1)
          })()
        : null
    const consensus = new Set(castVotes).size === 1 && castVotes.length === voters.length

    room.storyCount += 1
    const storyTitle = room.currentStory.trim() || `Story ${room.storyCount}`

    const record: StoryRecord = {
      title: storyTitle,
      votes: { ...room.votes },
      average,
      consensus,
    }
    room.stories.push(record)

    // Reset round
    room.phase = 'voting'
    room.currentStory = nextStory.trim()
    for (const pid of Object.keys(room.votes)) {
      room.votes[pid] = null
    }

    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ room: sanitizeRoom(room) })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/reset]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
