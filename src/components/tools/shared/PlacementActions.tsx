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
      <p className="text-sm text-slate-300">Your anchor</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseGps}
          disabled={gpsLoading}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
        >
          {gpsLoading ? "Locating…" : "Use my location"}
        </button>
        <button
          type="button"
          onClick={onPlaceAtMapTap}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium ${
            awaitingPlacement ? "bg-sky-500 text-slate-950" : "bg-slate-800"
          }`}
        >
          {awaitingPlacement ? "Tap the map" : "Place at map tap"}
        </button>
      </div>
      {hasCenter ? (
        <p className="text-sm text-slate-400">{centerHint}</p>
      ) : null}
    </div>
  );
}
