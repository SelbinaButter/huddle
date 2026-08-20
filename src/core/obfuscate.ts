function dateKey(date: string): number {
  let hash = 2166136261
  for (const char of `huddle:${date}:v1`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

export function encodeShell(shellId: string, date: string): string {
  const bytes = new TextEncoder().encode(shellId)
  const key = dateKey(date)
  return bytesToBase64(bytes.map((byte, index) => byte ^ ((key >>> ((index % 4) * 8)) & 255)))
}

export function decodeShell(encoded: string, date: string): string {
  const key = dateKey(date)
  const bytes = base64ToBytes(encoded).map((byte, index) => byte ^ ((key >>> ((index % 4) * 8)) & 255))
  return new TextDecoder().decode(bytes)
}
