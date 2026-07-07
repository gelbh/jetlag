import { useMemo } from "react";
import { MapView } from "../map/MapView";
import { FramingPreviewLayers } from "../map/FramingPreviewLayers";
import { useScrollLock } from "../../hooks/useScrollLock";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { GameArea } from "../../domain/map/annotations";
import {
  formatPlayAreaSummary,
  gameAreaSquareMiles,
  gameSizeLabel,
  recommendGameSize,
} from "../../domain/session/gameSize";
import { gameAreaToBoundingBox } from "../../domain/geometry/geometry";
import type {
  FramingMode,
  GameAreaFramingResult,
} from "../../hooks/session/useGameAreaFraming";
import type { LatLngBoundsExpression } from "leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";

const FRAMING_MODES: Array<{ value: FramingMode; label: string }> = [
  { value: "rectangle", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "polygon", label: "Polygon" },
];

function framingModeHint(mode: FramingMode): string {
  switch (mode) {
    case "rectangle":
      return "Pan and zoom the map. The dashed border marks your play area.";
    case "circle":
      return "Tap the map for center, then zoom in or out to set size.";
    case "polygon":
      return "Tap corners on the map, then close the polygon.";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export interface GameAreaFramingController {
  framingMode: FramingMode;
  setFramingMode: (mode: FramingMode) => void;
  focusBounds: LatLngBoundsExpression | null;
  previewGameArea: GameArea | null;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
  hasValidDraft: boolean;
  handleBoundsChange: (bounds: import("leaflet").LatLngBounds) => void;
  handleUserViewportFramed: () => void;
  handleMapClick: (lat: number, lng: number) => void;
  closePolygon: () => boolean;
  resetPolygonVertices: () => void;
}

interface GameAreaFramingModalProps {
  open: boolean;
  mapStyle: MapStyle;
  framing: GameAreaFramingController;
  onClose: () => void;
  onConfirm: (result: GameAreaFramingResult) => void;
}

export function GameAreaFramingModal({
  open,
  mapStyle,
  framing,
  onClose,
  onConfirm,
}: GameAreaFramingModalProps) {
  useScrollLock(open);

  const previewSummary = useMemo(() => {
    if (!framing.previewGameArea) {
      return null;
    }

    return formatPlayAreaSummary(
      gameAreaSquareMiles(framing.previewGameArea),
    );
  }, [framing.previewGameArea]);

  const recommendedSize = framing.previewGameArea
    ? recommendGameSize(framing.previewGameArea)
    : null;

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (!framing.previewGameArea || !framing.hasValidDraft) {
      return;
    }

    onConfirm({
      gameArea: framing.previewGameArea,
      focusBounds: gameAreaToBoundingBox(framing.previewGameArea),
    });
    onClose();
  };

  const maskGameArea =
    framing.framingMode === "circle" && !framing.previewGameArea
      ? null
      : framing.previewGameArea;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] bg-surface-deep">
      <div className="absolute inset-0">
        <MapView
          mapStyle={mapStyle}
          zoom={10}
          focusBounds={framing.focusBounds}
          fitBoundsPadding={[48, 48]}
          showZoomControl
          onBoundsChange={framing.handleBoundsChange}
          onUserViewportFramed={framing.handleUserViewportFramed}
          onMapClick={framing.handleMapClick}
          className="h-full w-full"
        >
          <FramingPreviewLayers
            gameArea={maskGameArea}
            framingMode={framing.framingMode}
            circleCenter={framing.circleCenter}
            circleRadiusMeters={framing.circleRadiusMeters}
            polygonVertices={framing.polygonVertices}
          />
        </MapView>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-panel)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto hud-chrome mx-auto max-w-xl space-y-3 rounded-[var(--radius-hud-md)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-bold uppercase tracking-tight text-ink">
              Frame game area
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-full border border-border px-3 text-xs font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!framing.hasValidDraft}
                className="btn-primary min-h-10 px-4 text-xs disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FRAMING_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => framing.setFramingMode(mode.value)}
                className={`min-h-10 border-2 px-2 py-1.5 text-xs font-semibold ${
                  framing.framingMode === mode.value
                    ? "border-highlight bg-highlight-soft text-highlight"
                    : "border-border bg-surface-deep text-ink"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-panel)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto hud-chrome mx-auto max-w-xl space-y-3 rounded-[var(--radius-hud-md)] p-3">
          <p className="text-sm text-ink-muted">
            {framingModeHint(framing.framingMode)}
          </p>

          {framing.framingMode === "polygon" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => framing.closePolygon()}
                disabled={framing.polygonVertices.length < 3}
                className="btn-primary min-h-11 disabled:opacity-50"
              >
                Close polygon
              </button>
              <button
                type="button"
                onClick={() => framing.resetPolygonVertices()}
                disabled={framing.polygonVertices.length === 0}
                className="min-h-11 rounded-xl bg-surface-raised px-3 text-sm font-medium disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          ) : null}

          {previewSummary ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-mono tabular-nums text-ink">
                {previewSummary}
              </span>
              {recommendedSize ? (
                <span className="text-ink-muted">
                  Suggested{" "}
                  <span className="font-medium text-brand-blue">
                    {gameSizeLabel(recommendedSize).label}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
