import { NextRequest, NextResponse } from 'next/server'
import { getRoom, saveRoom, sanitizeRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = await getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const { playerId, duration } = await req.json()
    if (playerId !== room.moderatorId) {
      return NextResponse.json({ error: 'Only the moderator can control the timer' }, { status: 403 })
    }

    // duration = 0 cancels, otherwise sets end timestamp
    room.timerEndsAt = duration > 0 ? Date.now() + duration * 1000 : null

    await saveRoom(room)
    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/timer]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
