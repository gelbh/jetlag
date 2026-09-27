import type { TransitStation } from "../../domain/session/hiding/hidingZone";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";

/** Shared zone-tool bag for HudBody + map-first placement chrome. */
export interface HidingZoneToolPanelState {
  query: string;
  setQuery: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  setSelectedStation: (station: TransitStation) => void;
  clearStationSelection: () => void;
  manualMode: boolean;
  methodChosen: boolean;
  choosePlacementMethod: (manual: boolean) => void;
  manualCenter: LatLngTuple | null;
  hasPlacement: boolean;
  confirmZone: () => void | Promise<void>;
  saving: boolean;
  error: string | null;
}
