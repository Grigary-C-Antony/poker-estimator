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

    const { playerId, story } = await req.json()
    if (playerId !== room.moderatorId) {
      return NextResponse.json({ error: 'Only the moderator can update the story' }, { status: 403 })
    }

    room.currentStory = story ?? ''
    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/story]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
