export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

function isValidIceServerEntry(entry) {
  if (!entry || typeof entry !== 'object') return false
  const urls = entry.urls
  if (typeof urls === 'string') return urls.trim().length > 0
  if (Array.isArray(urls)) {
    return urls.length > 0 && urls.every((item) => typeof item === 'string' && item.trim().length > 0)
  }
  return false
}

export function resolveIceServers(override) {
  if (Array.isArray(override) && override.every(isValidIceServerEntry)) {
    return override
  }

  const runtimeOverride = globalThis?.PEER_BRIDGE_ICE_SERVERS
  if (Array.isArray(runtimeOverride) && runtimeOverride.every(isValidIceServerEntry)) {
    return runtimeOverride
  }

  return DEFAULT_ICE_SERVERS
}

export function getIceConfiguration(override) {
  return { iceServers: resolveIceServers(override) }
}
