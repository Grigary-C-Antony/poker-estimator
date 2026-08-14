import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'
import type { CardValue } from '@/lib/types'
import { CARD_SET } from '@/lib/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.phase === 'revealed') return NextResponse.json({ error: 'Voting is closed' }, { status: 400 })

    const { playerId, vote } = await req.json()
    if (!playerId || !CARD_SET.includes(vote as CardValue)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }
    if (!Object.prototype.hasOwnProperty.call(room.votes, playerId)) {
      return NextResponse.json({ error: 'Player not in room' }, { status: 403 })
    }

    room.votes[playerId] = vote as CardValue
    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/vote]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
