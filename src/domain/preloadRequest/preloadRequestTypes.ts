import type { DistanceUnit } from "../map/distance";
import type { BoundingBox } from "../geometry/gameArea/gameAreaBounds";
import type { GameSize } from "../session/size/gameSize";
import type { RegionPackId } from "../regions/regionPack";

/** v1 status enum — do not change without updating the max-data plan + spec. */
export type PreloadRequestStatus =
  | "open"
  | "accepted"
  | "declined"
  | "shipped";

export const PRELOAD_REQUEST_STATUSES: readonly PreloadRequestStatus[] = [
  "open",
  "accepted",
  "declined",
  "shipped",
] as const;

export const PRELOAD_NOTE_MAX_LENGTH = 140;

export interface PreloadPresetSnapshot {
  name: string;
  placeLabel?: string;
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  focusBounds?: BoundingBox;
  /** Serialized game-area size hint only — never the full geometry. */
  gameAreaBytes?: number;
  regionPackId?: RegionPackId;
  presetId?: string;
}

export interface PreloadRequestEmailState {
  sentAt?: string;
  messageId?: string;
  error?: string;
}

export interface PreloadRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: PreloadRequestStatus;
  reporterUid: string;
  presetSnapshot: PreloadPresetSnapshot;
  note?: string | null;
  email?: PreloadRequestEmailState;
}
