import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { pusherServer, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id.toUpperCase())
  if (!room) return NextResponse.json({ ok: true })

  const { playerId } = await req.json()
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })

  room.players = room.players.filter((p) => p.id !== playerId)
  delete room.votes[playerId]

  // Transfer moderation if the moderator left
  if (room.moderatorId === playerId && room.players.length > 0) {
    room.moderatorId = room.players[0].id
  }

  await pusherServer.trigger(getRoomChannel(room.id), 'room-updated', {
    room: sanitizeRoom(room),
  })

  return NextResponse.json({ ok: true })
}
