import { NextRequest, NextResponse } from 'next/server'
import { createRoom, sanitizeRoom } from '@/lib/store'
import { pusherServer, getRoomChannel } from '@/lib/pusher-server'

export async function POST(req: NextRequest) {
  const { roomName, moderatorId, moderatorName } = await req.json()

  if (!roomName?.trim() || !moderatorId || !moderatorName?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const room = createRoom(roomName.trim(), moderatorId, moderatorName.trim())

  await pusherServer.trigger(getRoomChannel(room.id), 'room-updated', {
    room: sanitizeRoom(room),
  })

  return NextResponse.json({ room: sanitizeRoom(room) })
}
