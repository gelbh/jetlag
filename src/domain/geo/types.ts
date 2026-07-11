import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";

export interface MeasuringPlace {
  id: string;
  name: string;
  point: LatLngTuple;
}

export interface MatchingFeature {
  id: string;
  name: string;
  point: LatLngTuple;
  inPlayArea?: boolean;
  adminLevel?: number;
  boundary?: GameArea;
}

export interface AdminDivisionFeature {
  id: string;
  name: string;
  adminLevel: number;
  boundary: GameArea;
  representativePoint: LatLngTuple;
}
