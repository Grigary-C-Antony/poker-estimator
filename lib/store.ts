import { neon } from '@neondatabase/serverless'
import type { Room, ClientRoom } from './types'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS poker_rooms (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

let tableReady = false
async function db() {
  if (!tableReady) {
    await ensureTable()
    tableReady = true
  }
  return sql
}

export async function getRoom(id: string): Promise<Room | null> {
  const q = await db()
  const rows = await q`SELECT data FROM poker_rooms WHERE id = ${id}`
  return rows.length > 0 ? (rows[0].data as Room) : null
}

export async function saveRoom(room: Room): Promise<void> {
  const q = await db()
  await q`
    INSERT INTO poker_rooms (id, data, updated_at)
    VALUES (${room.id}, ${JSON.stringify(room)}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `
}

async function roomExists(id: string): Promise<boolean> {
  const q = await db()
  const rows = await q`SELECT 1 FROM poker_rooms WHERE id = ${id}`
  return rows.length > 0
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export async function createRoom(name: string, moderatorId: string, moderatorName: string): Promise<Room> {
  let id = generateRoomId()
  while (await roomExists(id)) id = generateRoomId()

  const room: Room = {
    id,
    name,
    moderatorId,
    players: [{ id: moderatorId, name: moderatorName, isSpectator: false }],
    currentStory: '',
    phase: 'voting',
    votes: { [moderatorId]: null },
    stories: [],
    storyCount: 0,
  }

  await saveRoom(room)
  return room
}

export function sanitizeRoom(room: Room): ClientRoom {
  const hasVoted: Record<string, boolean> = {}
  for (const [playerId, vote] of Object.entries(room.votes)) {
    hasVoted[playerId] = vote !== null
  }
  return { ...room, votes: hasVoted }
}
