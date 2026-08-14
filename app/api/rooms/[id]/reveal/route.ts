import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/store'
import { safeTrigger, getRoomChannel } from '@/lib/pusher-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const { playerId } = await req.json()
    if (playerId !== room.moderatorId) {
      return NextResponse.json({ error: 'Only the moderator can reveal votes' }, { status: 403 })
    }

    room.phase = 'revealed'
    await safeTrigger(getRoomChannel(room.id), 'votes-revealed', { room })

    return NextResponse.json({ room })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/reveal]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
