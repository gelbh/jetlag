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
    <div className="space-y-2">
      <p className="text-sm text-ink-muted">Your anchor</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseGps}
          disabled={gpsLoading}
          className="min-h-12 rounded-xl bg-surface-raised px-3 text-sm font-medium disabled:opacity-40"
        >
          {gpsLoading ? "Locating…" : "Use my location"}
        </button>
        <button
          type="button"
          onClick={onPlaceAtMapTap}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium ${
            awaitingPlacement ? "bg-action text-action-ink" : "bg-surface-raised"
          }`}
        >
          {awaitingPlacement ? "Tap the map" : "Place at map tap"}
        </button>
      </div>
      {hasCenter ? (
        <p className="text-sm text-ink-dim">{centerHint}</p>
      ) : null}
    </div>
  );
}
