import type { LatLngBoundsExpression } from "leaflet";
import { MapView } from "../map/MapView";
import { GameAreaMask } from "../map/GameAreaMask";
import type { GameArea } from "../../domain/annotations";
import type { MapStyle } from "../../domain/mapBasemaps";
import {
  formatPlayAreaSummary,
  gameAreaSquareMiles,
  gameSizeLabel,
  recommendGameSize,
  type GameSize,
} from "../../domain/gameSize";

interface CreateSessionMapPaneProps {
  mapStyle: MapStyle;
  focusBounds: LatLngBoundsExpression | null;
  previewGameArea: GameArea | null;
  selectedGameSize: GameSize;
  onBoundsChange: (bounds: import("leaflet").LatLngBounds) => void;
}

export function CreateSessionMapPane({
  mapStyle,
  focusBounds,
  previewGameArea,
  selectedGameSize,
  onBoundsChange,
}: CreateSessionMapPaneProps) {
  const recommendedSize = previewGameArea
    ? recommendGameSize(previewGameArea)
    : null;
  const playAreaSummary = previewGameArea
    ? formatPlayAreaSummary(gameAreaSquareMiles(previewGameArea))
    : null;
  const sizeMismatch =
    recommendedSize !== null && recommendedSize !== selectedGameSize;

  return (
    <div className="relative min-h-[32dvh] max-h-[45dvh] flex-[1_0_40dvh] shrink-0">
      <div className="absolute inset-0">
        <MapView
          mapStyle={mapStyle}
          onBoundsChange={onBoundsChange}
          zoom={12}
          focusBounds={focusBounds}
          className="h-full w-full"
        >
          {previewGameArea ? (
            <GameAreaMask gameArea={previewGameArea} framing />
          ) : null}
        </MapView>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-banner)] flex justify-center px-3 pb-3"
        aria-live="polite"
      >
        {previewGameArea && playAreaSummary ? (
          <div className="hud-chrome flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-hud-md)] px-3 py-2 text-xs">
            <span className="font-mono text-xs tabular-nums text-ink">
              {playAreaSummary}
            </span>
            {recommendedSize ? (
              <span className="text-ink-muted">
                Suggested{" "}
                <span className="font-medium text-brand-blue">
                  {gameSizeLabel(recommendedSize).label}
                </span>
              </span>
            ) : null}
            {sizeMismatch ? (
              <span className="text-status-warning">
                Selected size differs from suggestion
              </span>
            ) : null}
          </div>
        ) : (
          <p className="hud-chrome rounded-[var(--radius-hud-md)] px-3 py-2 text-xs text-ink-dim">
            Search or pan to set play area
          </p>
        )}
      </div>
    </div>
  );
}
