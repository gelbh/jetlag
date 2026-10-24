import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { TransitStation } from "../../domain/session/hiding/hidingZone";

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
  snapping: boolean;
  hasPlacement: boolean;
  confirmZone: () => void | Promise<void>;
  saving: boolean;
  error: string | null;
}
