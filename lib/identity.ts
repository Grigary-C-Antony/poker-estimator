// Persists player identity (playerId + name) in a 30-day cookie
// so rejoining a room pre-fills their name and reuses their ID.

const COOKIE_NAME = 'poker_identity'

export function getIdentity(): { playerId: string; playerName: string } | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  try { return JSON.parse(decodeURIComponent(match[1])) } catch { return null }
}

export function saveIdentity(playerId: string, playerName: string) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ playerId, playerName }))}; expires=${expires}; path=/; SameSite=Lax`
}
