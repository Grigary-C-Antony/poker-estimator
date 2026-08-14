import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  if (room.phase === 'revealed') {
    return NextResponse.json({ room })
  }
  return NextResponse.json({ room: sanitizeRoom(room) })
}
