import { type Bbox, isValidBbox } from "../../map/tileBbox";

// Relative imports: this module is bundled into the service worker (src/sw.ts).

/** Client → SW: current session game-area bbox (`null` clears it on session end). */
export const GAME_AREA_SW_MESSAGE_TYPE = "jetlag:game-area";

export interface GameAreaSwMessage {
  type: typeof GAME_AREA_SW_MESSAGE_TYPE;
  bbox: Bbox | null;
}

export function createGameAreaSwMessage(bbox: Bbox | null): GameAreaSwMessage {
  return { type: GAME_AREA_SW_MESSAGE_TYPE, bbox };
}

/**
 * Validate an untrusted `postMessage` payload. Returns the message when it is a
 * well-formed game-area message, else `null` (wrong type or malformed bbox).
 */
export function parseGameAreaSwMessage(data: unknown): GameAreaSwMessage | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const { type, bbox } = data as Record<string, unknown>;
  if (type !== GAME_AREA_SW_MESSAGE_TYPE) {
    return null;
  }
  if (bbox === null) {
    return createGameAreaSwMessage(null);
  }
  if (!isValidBbox(bbox)) {
    return null;
  }
  const { south, west, north, east } = bbox;
  return createGameAreaSwMessage({ south, west, north, east });
}
