import { MapView } from "../map/MapView";
import { FramingPreviewLayers } from "../map/FramingPreviewLayers";
import { GameAreaMask } from "../map/GameAreaMask";
import { useScrollLock } from "../../hooks/useScrollLock";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import {
  boundingBoxHasMinimumSpan,
  gameAreaToBoundingBox,
} from "../../domain/geometry/geometry";
import type {
  FramingMode,
  GameAreaFramingResult,
} from "../../hooks/session/useGameAreaFraming";
import type { LatLngBoundsExpression } from "leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { GameArea } from "../../domain/map/annotations";
import {
  FramingModeSegmentControl,
  GameAreaFramingPolygonActions,
  GameAreaFramingStats,
} from "./GameAreaFramingControls";
import { framingModeHint } from "./gameAreaFramingUi";
import { SheetHeader } from "../ui/SheetHeader";

export interface GameAreaFramingController {
  framingMode: FramingMode;
  setFramingMode: (mode: FramingMode) => void;
  focusBounds: LatLngBoundsExpression | null;
  previewGameArea: GameArea | null;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
  hasValidDraft: boolean;
  userFramed: boolean;
  handleBoundsChange: (bounds: import("leaflet").LatLngBounds) => void;
  handleUserViewportFramed: () => void;
  handleMapClick: (lat: number, lng: number) => void;
  closePolygon: () => boolean;
  resetPolygonVertices: () => void;
}

interface GameAreaFramingModalProps {
  open: boolean;
  mapStyle: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
  framing: GameAreaFramingController;
  /** Place search or saved area shown until the user draws on the map. */
  referenceGameArea?: GameArea | null;
  referenceFocusBounds?: LatLngBoundsExpression | null;
  onClose: () => void;
  onConfirm: (result: GameAreaFramingResult) => void;
}

export function GameAreaFramingModal({
  open,
  mapStyle,
  onMapStyleChange,
  framing,
  referenceGameArea = null,
  referenceFocusBounds = null,
  onClose,
  onConfirm,
}: GameAreaFramingModalProps) {
  useScrollLock(open);

  if (!open) {
    return null;
  }

  const manualFramingActive = framing.userFramed;
  const effectiveGameArea = manualFramingActive
    ? framing.previewGameArea
    : (referenceGameArea ?? framing.previewGameArea);
  const effectiveFocusBounds =
    !manualFramingActive && referenceFocusBounds
      ? referenceFocusBounds
      : framing.focusBounds;
  const hasValidDraft = manualFramingActive
    ? framing.hasValidDraft
    : Boolean(
        effectiveGameArea &&
          boundingBoxHasMinimumSpan(gameAreaToBoundingBox(effectiveGameArea)),
      );

  const handleConfirm = () => {
    if (!effectiveGameArea || !hasValidDraft) {
      return;
    }

    onConfirm({
      gameArea: effectiveGameArea,
      focusBounds: gameAreaToBoundingBox(effectiveGameArea),
    });
    onClose();
  };

  const maskGameArea =
    framing.framingMode === "circle" && !effectiveGameArea
      ? null
      : effectiveGameArea;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] bg-surface-deep">
      <div className="absolute inset-0">
        <MapView
          mapStyle={mapStyle}
          onMapStyleChange={onMapStyleChange}
          zoom={10}
          focusBounds={effectiveFocusBounds}
          fitBoundsPadding={[56, 56]}
          showZoomControl
          zoomControlInset="safe-area"
          mapStyleControlInset="safe-area"
          onBoundsChange={framing.handleBoundsChange}
          onUserViewportFramed={framing.handleUserViewportFramed}
          onMapClick={framing.handleMapClick}
          className="h-full w-full"
        >
          {manualFramingActive ? (
            <FramingPreviewLayers
              gameArea={maskGameArea}
              framingMode={framing.framingMode}
              circleCenter={framing.circleCenter}
              circleRadiusMeters={framing.circleRadiusMeters}
              polygonVertices={framing.polygonVertices}
            />
          ) : effectiveGameArea ? (
            <GameAreaMask gameArea={effectiveGameArea} framing />
          ) : null}
        </MapView>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-panel)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto hud-panel mx-auto max-w-xl space-y-3 p-3 pt-4">
          <SheetHeader
            eyebrow="Play boundary"
            title="Frame area"
            titleSize="xl"
            onClose={onClose}
            flush
            className="items-start"
            trailing={
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary min-h-11 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasValidDraft}
                  className="btn-primary min-h-11 px-4 text-xs disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            }
          />

          <FramingModeSegmentControl
            value={framing.framingMode}
            onChange={framing.setFramingMode}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-panel)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto hud-panel mx-auto max-w-xl space-y-3 p-3 pt-4">
          <p className="text-sm leading-snug text-ink-secondary">
            {framingModeHint(framing.framingMode)}
          </p>

          {framing.framingMode === "polygon" ? (
            <GameAreaFramingPolygonActions
              vertexCount={framing.polygonVertices.length}
              onClose={() => framing.closePolygon()}
              onReset={() => framing.resetPolygonVertices()}
            />
          ) : null}

          <GameAreaFramingStats gameArea={effectiveGameArea} compact />
        </div>
      </div>
    </div>
  );
}
