import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { pusherServer, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { playerId } = await req.json()
  if (playerId !== room.moderatorId) {
    return NextResponse.json({ error: 'Only the moderator can reset' }, { status: 403 })
  }

  room.phase = 'voting'
  for (const id of Object.keys(room.votes)) {
    room.votes[id] = null
  }

  await pusherServer.trigger(getRoomChannel(room.id), 'room-updated', {
    room: sanitizeRoom(room),
  })

  return NextResponse.json({ room: sanitizeRoom(room) })
}
