const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function randomHexDigit() {
  return Math.floor(Math.random() * 16).toString(16)
}

function randomByte() {
  return Math.floor(Math.random() * 256)
}

function fallbackUuidV4() {
  const bytes = new Uint8Array(16)

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = randomByte()
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4_REGEX.test(value)
}

export function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID()
    if (isUuidV4(uuid)) {
      return uuid
    }
  }

  let uuid = fallbackUuidV4()
  if (!isUuidV4(uuid)) {
    uuid = `00000000-0000-4000-8000-${Array.from({ length: 12 }, randomHexDigit).join('')}`
  }

  return uuid
}
