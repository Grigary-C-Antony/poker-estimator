import type { Room, ClientRoom } from './types'

// ── Redis (production) ───────────────────────────────────
// Only loaded when UPSTASH env vars are present.
// Falls back to in-memory for local dev without Upstash.

const PREFIX = 'poker:room:'
const TTL = 60 * 60 * 24 // 24 hours

function isRedisConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? ''
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''
  return url.startsWith('https://') && token.length > 0
}

let _redis: import('@upstash/redis').Redis | null = null

async function getRedis() {
  if (!isRedisConfigured()) return null
  if (!_redis) {
    const { Redis } = await import('@upstash/redis')
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

// ── In-memory fallback (local dev) ──────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __poker_rooms: Map<string, Room> | undefined
}
const memStore: Map<string, Room> =
  global.__poker_rooms ?? (global.__poker_rooms = new Map())

// ── Public API ───────────────────────────────────────────

export async function getRoom(id: string): Promise<Room | null> {
  const redis = await getRedis()
  if (redis) {
    return (await redis.get<Room>(`${PREFIX}${id}`)) ?? null
  }
  return memStore.get(id) ?? null
}

export async function saveRoom(room: Room): Promise<void> {
  const redis = await getRedis()
  if (redis) {
    await redis.setex(`${PREFIX}${room.id}`, TTL, JSON.stringify(room))
  } else {
    memStore.set(room.id, room)
  }
}

async function roomExists(id: string): Promise<boolean> {
  const redis = await getRedis()
  if (redis) return (await redis.exists(`${PREFIX}${id}`)) > 0
  return memStore.has(id)
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
