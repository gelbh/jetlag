import type { ReactNode } from "react";
import type { LatLngTuple } from "../../domain/geometry";

export interface MapToolHookResult {
  draft: Record<string, unknown>;
  placementCrosshair: boolean;
  handleMapClick: (point: LatLngTuple) => void | boolean;
  resetDraft: () => void;
  panel: ReactNode;
}
