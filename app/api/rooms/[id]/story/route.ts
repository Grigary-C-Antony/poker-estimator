import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'
import { pusherServer, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { playerId, story } = await req.json()
  if (playerId !== room.moderatorId) {
    return NextResponse.json({ error: 'Only the moderator can update the story' }, { status: 403 })
  }

  room.currentStory = story ?? ''

  await pusherServer.trigger(getRoomChannel(room.id), 'room-updated', {
    room: sanitizeRoom(room),
  })

  return NextResponse.json({ ok: true })
}
