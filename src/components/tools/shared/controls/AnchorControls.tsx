interface AnchorControlsProps {
  gpsLoading: boolean;
  hasAnchor: boolean;
  onUseGps: () => void;
  onPlaceAtMapTap?: () => void;
  awaitingPlacement?: boolean;
  anchorPlaceName?: string | null;
  anchorHint?: string;
  gpsLabel?: string;
  gpsLoadingLabel?: string;
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
  const gpsStatus = gpsLoading
    ? gpsLoadingLabel
    : hasAnchor
      ? anchorPlaceName ?? "Location locked"
      : "Tap to use GPS";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onUseGps}
        disabled={gpsLoading}
        aria-busy={gpsLoading}
        className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-40"
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-current text-[0.625rem] font-bold"
          aria-hidden="true"
        >
          ●
        </span>
        <span className="flex min-w-0 flex-col items-start text-left leading-tight">
          <span className="text-sm font-semibold">
            {gpsLoading ? gpsLoadingLabel : gpsLabel}
          </span>
          {!gpsLoading ? (
            <span className="text-xs font-normal opacity-90">{gpsStatus}</span>
          ) : null}
        </span>
      </button>

      {passiveMap ? (
        <p className="text-center text-xs text-ink-dim">
          {hasAnchor ? (
            <>
              {anchorPlaceName ? (
                <>
                  Anchor ·{" "}
                  <span className="font-medium text-ink">{anchorPlaceName}</span>
                </>
              ) : (
                "Anchor set on the map"
              )}
              {!hasAnchor ? null : (
                <span className="mt-1 block">{anchorHint}</span>
              )}
            </>
          ) : (
            "Or tap anywhere on the map to set your anchor."
          )}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={onPlaceAtMapTap}
            className={`min-h-11 w-full rounded-[var(--radius-hud-md)] border-2 px-3 text-sm font-medium ${
              awaitingPlacement
                ? "border-highlight bg-highlight/15 text-highlight"
                : "border-border bg-surface-raised text-ink-secondary"
            }`}
          >
            {awaitingPlacement ? "Tap the map" : "Place at map tap"}
          </button>
          {hasAnchor ? (
            <p className="text-xs text-ink-dim">{anchorHint}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
