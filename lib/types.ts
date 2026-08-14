export type CardValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '40' | '100' | '?' | '☕'

export const CARD_SET: CardValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '40', '100', '?', '☕']

export type Player = {
  id: string
  name: string
  isSpectator: boolean
}

export type Room = {
  id: string
  name: string
  moderatorId: string
  players: Player[]
  currentStory: string
  phase: 'voting' | 'revealed'
  votes: Record<string, CardValue | null> // playerId -> vote value
}

// What clients see during voting — votes are hidden, only presence indicated
export type ClientRoom = Omit<Room, 'votes'> & {
  votes: Record<string, boolean> // playerId -> hasVoted
}

// What clients see after reveal
export type RevealedRoom = Room

export type RoomEvent =
  | { type: 'room-updated'; room: ClientRoom }
  | { type: 'votes-revealed'; room: RevealedRoom }
