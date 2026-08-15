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

    const { moderatorId, targetId } = await req.json()
    if (moderatorId !== room.moderatorId) {
      return NextResponse.json({ error: 'Only the moderator can remove players' }, { status: 403 })
    }
    if (targetId === room.moderatorId) {
      return NextResponse.json({ error: 'Moderator cannot remove themselves' }, { status: 400 })
    }

    room.players = room.players.filter((p) => p.id !== targetId)
    delete room.votes[targetId]

    await saveRoom(room)
    await safeTrigger(getRoomChannel(room.id), 'room-updated', { room: sanitizeRoom(room) })
    await safeTrigger(getRoomChannel(room.id), 'player-kicked', { playerId: targetId })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[POST /api/rooms/[id]/kick]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
