import { NextRequest, NextResponse } from 'next/server'
import { createRoom, sanitizeRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'

export async function POST(req: NextRequest) {
  try {
    const { roomName, moderatorId, moderatorName, isSpectator = false } = await req.json()

    if (!roomName?.trim() || !moderatorId || !moderatorName?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const room = await createRoom(roomName.trim(), moderatorId, moderatorName.trim(), isSpectator)
    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ room: sanitizeRoom(room) })
  } catch (err: any) {
    console.error('[POST /api/rooms]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
