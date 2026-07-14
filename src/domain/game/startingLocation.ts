import type { PlayerRole } from "../session/playerRole";

export interface StartingLocationRecord {
  uid: string;
  sessionId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  role: PlayerRole;
  capturedAt: string;
}
