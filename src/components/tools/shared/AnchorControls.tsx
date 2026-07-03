interface AnchorControlsProps {
  gpsLoading: boolean;
  hasAnchor: boolean;
  onUseGps: () => void;
  /** Interactive map placement button (radar, tentacle). Omit for passive map-tap (matching, measuring). */
  onPlaceAtMapTap?: () => void;
  awaitingPlacement?: boolean;
  /** Named place when anchor was resolved via search. */
  anchorPlaceName?: string | null;
  anchorHint?: string;
  gpsLabel?: string;
  gpsLoadingLabel?: string;
}

function PassiveMapAnchorStatus({
  hasAnchor,
  anchorPlaceName,
  anchorHint,
}: {
  hasAnchor: boolean;
  anchorPlaceName?: string | null;
  anchorHint?: string;
}) {
  if (!hasAnchor) {
    return (
      <p className="text-xs text-ink-dim">
        Or tap anywhere on the map to set your anchor.
      </p>
    );
  }

  return (
    <div className="space-y-1" aria-live="polite">
      <p className="text-xs text-ink-secondary">
        {anchorPlaceName ? (
          <>
            Anchor set ·{" "}
            <span className="font-medium text-ink">{anchorPlaceName}</span>
          </>
        ) : (
          "Anchor set on the map"
        )}
      </p>
      {anchorHint ? (
        <p className="text-xs text-ink-dim">{anchorHint}</p>
      ) : null}
    </div>
  );
}

export function AnchorControls({
  gpsLoading,
  hasAnchor,
  onUseGps,
  onPlaceAtMapTap,
  awaitingPlacement = false,
  anchorPlaceName,
  anchorHint = "Tap the map to move your anchor.",
  gpsLabel = "Use my location",
  gpsLoadingLabel = "Reading GPS…",
}: AnchorControlsProps) {
  const passiveMap = onPlaceAtMapTap === undefined;

  return (
    <div className="space-y-1.5">
      <div className={passiveMap ? "space-y-1.5" : "grid grid-cols-2 gap-2"}>
        <button
          type="button"
          onClick={onUseGps}
          disabled={gpsLoading}
          className={`btn-secondary disabled:opacity-40 ${passiveMap ? "w-full" : ""}`}
        >
          {gpsLoading ? gpsLoadingLabel : gpsLabel}
        </button>
        {passiveMap ? (
          <PassiveMapAnchorStatus
            hasAnchor={hasAnchor}
            anchorPlaceName={anchorPlaceName}
            anchorHint={hasAnchor ? anchorHint : undefined}
          />
        ) : (
          <button
            type="button"
            onClick={onPlaceAtMapTap}
            className={`min-h-12 rounded-[var(--radius-hud-md)] px-3 text-sm font-medium ${
              awaitingPlacement
                ? "bg-action text-action-ink"
                : "bg-surface-raised text-ink-secondary"
            }`}
          >
            {awaitingPlacement ? "Tap the map" : "Place at map tap"}
          </button>
        )}
      </div>
      {!passiveMap && hasAnchor && anchorHint ? (
        <p className="text-sm text-ink-dim">{anchorHint}</p>
      ) : null}
    </div>
  );
}
