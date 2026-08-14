import { NextRequest, NextResponse } from 'next/server'
import { getRoom, sanitizeRoom } from '@/lib/store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = await getRoom(id.toUpperCase())
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    return NextResponse.json({ room: room.phase === 'revealed' ? room : sanitizeRoom(room) })
  } catch (err: any) {
    console.error('[GET /api/rooms/[id]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
