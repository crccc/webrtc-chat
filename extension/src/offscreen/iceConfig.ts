export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
] satisfies RTCIceServer[]

type RuntimeGlobal = typeof globalThis & {
  PEER_BRIDGE_ICE_SERVERS?: RTCIceServer[]
}

function isValidIceServerEntry(entry: unknown): entry is RTCIceServer {
  if (!entry || typeof entry !== 'object') return false
  const urls = (entry as RTCIceServer).urls
  if (typeof urls === 'string') return urls.trim().length > 0
  if (Array.isArray(urls)) {
    return urls.length > 0 && urls.every((item) => typeof item === 'string' && item.trim().length > 0)
  }
  return false
}

export function resolveIceServers(override?: RTCIceServer[]): RTCIceServer[] {
  if (Array.isArray(override) && override.every(isValidIceServerEntry)) {
    return override
  }

  const runtimeOverride = (globalThis as RuntimeGlobal).PEER_BRIDGE_ICE_SERVERS
  if (Array.isArray(runtimeOverride) && runtimeOverride.every(isValidIceServerEntry)) {
    return runtimeOverride
  }

  return DEFAULT_ICE_SERVERS
}

export function getIceConfiguration(override?: RTCIceServer[]): RTCConfiguration {
  return { iceServers: resolveIceServers(override) }
}
