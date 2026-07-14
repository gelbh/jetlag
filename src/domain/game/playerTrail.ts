import type { PlayerRole } from "../session/playerRole";

export interface PlayerTrailPointRecord {
  uid: string;
  sessionId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  role: PlayerRole;
  recordedAt: string;
}

export const TRAIL_MIN_DISTANCE_METERS = 50;
export const TRAIL_MIN_INTERVAL_MS = 60_000;
export const TRAIL_MAX_POINTS_PER_PLAYER = 500;
