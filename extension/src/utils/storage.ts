const CREATED_ROOM_ID_KEY = 'peer-bridge:created-room-id'

export function getCreatedRoomId(): string | null {
  try {
    const value = window.localStorage.getItem(CREATED_ROOM_ID_KEY)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function setCreatedRoomId(roomId: string): void {
  if (typeof roomId !== 'string' || !roomId.trim()) return

  try {
    window.localStorage.setItem(CREATED_ROOM_ID_KEY, roomId)
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}

export function clearCreatedRoomId(): void {
  try {
    window.localStorage.removeItem(CREATED_ROOM_ID_KEY)
  } catch {
    // Ignore storage cleanup failures in restricted environments.
  }
}
