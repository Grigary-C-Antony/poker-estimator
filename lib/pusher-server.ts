import Pusher from 'pusher'

// Singleton pattern
declare global {
  // eslint-disable-next-line no-var
  var __pusher_server: Pusher | undefined
}

export const pusherServer: Pusher =
  global.__pusher_server ??
  (global.__pusher_server = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  }))

export function getRoomChannel(roomId: string) {
  return `room-${roomId}`
}

/** Trigger a Pusher event without crashing the route if Pusher is unreachable */
export async function safeTrigger(channel: string, event: string, data: unknown) {
  try {
    await pusherServer.trigger(channel, event, data)
  } catch (err) {
    console.error(`[Pusher] trigger failed — ${channel}/${event}:`, err)
  }
}
