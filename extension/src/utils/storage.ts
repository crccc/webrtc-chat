const CREATED_ROOM_ID_KEY = 'peer-bridge:created-room-id'

function getChromeStorageArea(): chrome.storage.StorageArea | null {
  try {
    return chrome?.storage?.local ?? null
  } catch {
    return null
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window?.localStorage ?? null
  } catch {
    return null
  }
}

function readLocalStorageValue(): string | null {
  const storage = getLocalStorage()
  if (!storage || typeof storage.getItem !== 'function') return null

  const value = storage.getItem(CREATED_ROOM_ID_KEY)
  return value && value.trim() ? value : null
}

export async function getCreatedRoomId(): Promise<string | null> {
  const storage = getChromeStorageArea()
  if (storage) {
    try {
      const result = await storage.get(CREATED_ROOM_ID_KEY)
      const value = result?.[CREATED_ROOM_ID_KEY]
      return typeof value === 'string' && value.trim() ? value : null
    } catch (error) {
      console.warn('[peer-bridge] failed to read created room id from chrome storage', error)
    }
  }

  try {
    return readLocalStorageValue()
  } catch {
    return null
  }
}

export async function setCreatedRoomId(roomId: string): Promise<void> {
  if (typeof roomId !== 'string' || !roomId.trim()) return

  const normalizedRoomId = roomId.trim()
  const storage = getChromeStorageArea()
  if (storage) {
    try {
      await storage.set({ [CREATED_ROOM_ID_KEY]: normalizedRoomId })
      return
    } catch (error) {
      console.warn('[peer-bridge] failed to write created room id to chrome storage', error)
    }
  }

  try {
    const fallbackStorage = getLocalStorage()
    fallbackStorage?.setItem(CREATED_ROOM_ID_KEY, normalizedRoomId)
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}

export async function clearCreatedRoomId(): Promise<void> {
  const storage = getChromeStorageArea()
  if (storage) {
    try {
      await storage.remove(CREATED_ROOM_ID_KEY)
      return
    } catch (error) {
      console.warn('[peer-bridge] failed to clear created room id from chrome storage', error)
    }
  }

  try {
    getLocalStorage()?.removeItem(CREATED_ROOM_ID_KEY)
  } catch {
    // Ignore storage cleanup failures in restricted environments.
  }
}
