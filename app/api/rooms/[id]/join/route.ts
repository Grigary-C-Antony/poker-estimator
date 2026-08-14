import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const { playerId, playerName, isSpectator = false } = await req.json()
    if (!playerId || !playerName?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!room.players.find((p) => p.id === playerId)) {
      room.players.push({ id: playerId, name: playerName.trim(), isSpectator })
      if (!isSpectator) room.votes[playerId] = null
    }

    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ room: room.phase === 'revealed' ? room : sanitizeRoom(room) })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/join]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
