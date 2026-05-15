import type { GameArea, PlayerMode, SessionRecord } from './annotations'
import { LOCAL_SESSION_ID } from './annotations'

export interface LocalSessionDraft {
  id: string
  code: string
  gameArea: GameArea | null
}

export function createLocalSessionDraft(code: string): LocalSessionDraft {
  return {
    id: LOCAL_SESSION_ID,
    code,
    gameArea: null,
  }
}

export function toSessionRecord(
  draft: LocalSessionDraft,
  createdAt = new Date().toISOString(),
): SessionRecord | null {
  if (!draft.gameArea) {
    return null
  }

  return {
    id: draft.id,
    code: draft.code,
    gameArea: draft.gameArea,
    createdAt,
    memberUids: [],
  }
}

export function defaultPlayerMode(): PlayerMode {
  return 'seeker'
}

export function generateLocalCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  return code
}
