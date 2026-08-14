import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { pusherServer, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { playerId, playerName, isSpectator = false } = await req.json()
  if (!playerId || !playerName?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existingIndex = room.players.findIndex((p) => p.id === playerId)

  if (existingIndex === -1) {
    room.players.push({ id: playerId, name: playerName.trim(), isSpectator })
    if (!isSpectator) {
      room.votes[playerId] = null
    }
  }

  await pusherServer.trigger(getRoomChannel(room.id), 'room-updated', {
    room: sanitizeRoom(room),
  })

  if (room.phase === 'revealed') {
    return NextResponse.json({ room })
  }
  return NextResponse.json({ room: sanitizeRoom(room) })
}
