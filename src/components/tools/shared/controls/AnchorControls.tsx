import { Button } from "@mantine/core";
import { Crosshair, MapPin } from "@phosphor-icons/react";
import {
  iosFilledStyles,
  iosGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

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
  const mantinePlayerUi = usePlayerUiMantine();
  const passiveMap = onPlaceAtMapTap === undefined;
  const gpsStatus = gpsLoading
    ? gpsLoadingLabel
    : hasAnchor
      ? (anchorPlaceName ?? "Location locked")
      : "Tap to use GPS";

  const GpsGlyph = hasAnchor ? MapPin : Crosshair;

  const gpsBody = (
    <>
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        aria-hidden="true"
        style={
          mantinePlayerUi
            ? {
                backgroundColor: hasAnchor
                  ? "oklch(from var(--color-canvas) l c h / 0.35)"
                  : "oklch(from var(--color-canvas) l c h / 0.22)",
              }
            : undefined
        }
      >
        {mantinePlayerUi ? (
          <GpsGlyph size={18} weight={hasAnchor ? "fill" : "bold"} />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-current text-[0.625rem] font-bold">
            ●
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col items-start text-left leading-tight">
        <span className="text-sm font-semibold">
          {gpsLoading ? gpsLoadingLabel : gpsLabel}
        </span>
        {!gpsLoading ? (
          <span className="text-xs font-normal opacity-90">{gpsStatus}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <div
      className="space-y-2"
      {...(mantinePlayerUi ? { "data-player-ux-world": "mantine" } : {})}
    >
      {mantinePlayerUi ? (
        <Button
          type="button"
          fullWidth
          onClick={onUseGps}
          disabled={gpsLoading}
          aria-busy={gpsLoading || undefined}
          styles={hasAnchor && !gpsLoading ? iosGrayStyles : iosFilledStyles}
          className="flex min-h-12 items-center justify-start gap-2.5 px-3"
        >
          {gpsBody}
        </Button>
      ) : (
        <button
          type="button"
          onClick={onUseGps}
          disabled={gpsLoading}
          aria-busy={gpsLoading}
          className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-40"
        >
          {gpsBody}
        </button>
      )}

      {passiveMap ? (
        <p
          className="text-center text-xs text-field-ink-muted"
          style={
            mantinePlayerUi
              ? { margin: 0, lineHeight: 1.35, paddingInline: 4 }
              : undefined
          }
        >
          {hasAnchor ? (
            <>
              {anchorPlaceName ? (
                <>
                  Anchor ·{" "}
                  <span className="font-medium text-field-ink">
                    {anchorPlaceName}
                  </span>
                </>
              ) : (
                "Anchor set on the map"
              )}
              <span className="mt-1 block">{anchorHint}</span>
            </>
          ) : (
            "Or tap anywhere on the map to set your anchor."
          )}
        </p>
      ) : (
        <>
          {mantinePlayerUi ? (
            <Button
              type="button"
              fullWidth
              onClick={onPlaceAtMapTap}
              styles={awaitingPlacement ? iosFilledStyles : iosGrayStyles}
            >
              {awaitingPlacement ? "Tap the map" : "Place at map tap"}
            </Button>
          ) : (
            <button
              type="button"
              onClick={onPlaceAtMapTap}
              className={`min-h-11 w-full rounded-md border px-3 text-sm font-medium ${
                awaitingPlacement
                  ? "border-flag bg-flag-soft text-flag"
                  : "border-rule bg-canvas text-field-ink-muted"
              }`}
            >
              {awaitingPlacement ? "Tap the map" : "Place at map tap"}
            </button>
          )}
          {hasAnchor ? (
            <p className="text-xs text-field-ink-muted">{anchorHint}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
