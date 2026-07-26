import { AnchorControls } from "./AnchorControls";

interface PlacementActionsProps {
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading: boolean;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  centerHint?: string;
}

export function PlacementActions({
  awaitingPlacement,
  hasCenter,
  gpsLoading,
  onUseGps,
  onPlaceAtMapTap,
  centerHint = "Anchor pinned on the map. Tap again to move it.",
}: PlacementActionsProps) {
  return (
    <AnchorControls
      gpsLoading={gpsLoading}
      hasAnchor={hasCenter}
      onUseGps={onUseGps}
      onPlaceAtMapTap={onPlaceAtMapTap}
      awaitingPlacement={awaitingPlacement}
      anchorHint={hasCenter ? centerHint : undefined}
      gpsLoadingLabel="Locating…"
    />
  );
}
