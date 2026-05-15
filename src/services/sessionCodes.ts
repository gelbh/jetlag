const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateSessionCode(): string {
  let code = ''

  for (let index = 0; index < 4; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }

  return code
}

export function normalizeSessionCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
}

export function isValidSessionCode(value: string): boolean {
  return /^[A-Z]{4}$/.test(value)
}
