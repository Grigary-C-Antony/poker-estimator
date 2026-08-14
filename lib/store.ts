import type { Room } from './types'

// Persist across Next.js hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __poker_rooms: Map<string, Room> | undefined
}

export const rooms: Map<string, Room> =
  global.__poker_rooms ?? (global.__poker_rooms = new Map())

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export function createRoom(name: string, moderatorId: string, moderatorName: string): Room {
  let id = generateRoomId()
  while (rooms.has(id)) id = generateRoomId()

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

  rooms.set(id, room)
  return room
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id)
}

export function sanitizeRoom(room: Room): import('./types').ClientRoom {
  const hasVoted: Record<string, boolean> = {}
  for (const [playerId, vote] of Object.entries(room.votes)) {
    hasVoted[playerId] = vote !== null
  }
  return { ...room, votes: hasVoted }
}
