import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/gameArea/geometry";
import type {
  PoiCandidateSource,
  PoiConfirmStatus,
} from "./poiCandidate";

export interface MeasuringPlace {
  id: string;
  name: string;
  point: LatLngTuple;
  categoryId?: string;
  source?: PoiCandidateSource;
  /** Absent = confirmed (legacy Overpass/bundle). */
  confirmStatus?: PoiConfirmStatus;
  osmId?: string;
}

export interface MatchingFeature {
  id: string;
  name: string;
  point: LatLngTuple;
  inPlayArea?: boolean;
  adminLevel?: number;
  boundary?: GameArea;
  categoryId?: string;
  source?: PoiCandidateSource;
  /** Absent = confirmed (legacy Overpass/bundle). */
  confirmStatus?: PoiConfirmStatus;
  osmId?: string;
}

export interface AdminDivisionFeature {
  id: string;
  name: string;
  adminLevel: number;
  boundary: GameArea;
  representativePoint: LatLngTuple;
}
