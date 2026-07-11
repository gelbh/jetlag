import type { LatLngBoundsExpression } from "leaflet";
import { MapView } from "../map/MapView";
import { FramingPreviewLayers } from "../map/FramingPreviewLayers";
import { GameAreaMask } from "../map/GameAreaMask";
import type { GameArea } from "../../domain/map/annotations";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { FramingMode } from "../../hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  GameAreaFramingStats,
} from "./GameAreaFramingControls";
import { framingModeHint } from "./gameAreaFramingUi";
import { type GameSize } from "../../domain/session/gameSize";

interface CreateSessionMapPaneProps {
  mapStyle: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
  focusBounds: LatLngBoundsExpression | null;
  previewGameArea: GameArea | null;
  selectedGameSize: GameSize;
  manualFramingActive: boolean;
  framingMode: FramingMode;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
  onBoundsChange: (bounds: import("leaflet").LatLngBounds) => void;
  onUserViewportFramed: () => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export function CreateSessionMapPane({
  mapStyle,
  onMapStyleChange,
  focusBounds,
  previewGameArea,
  selectedGameSize,
  manualFramingActive,
  framingMode,
  circleCenter,
  circleRadiusMeters,
  polygonVertices,
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
}: CreateSessionMapPaneProps) {
  return (
    <div className="relative h-[33dvh] max-h-[36dvh] min-h-[28dvh] shrink-0 touch-none">
      <div className="absolute inset-0">
        <MapView
          mapStyle={mapStyle}
          onMapStyleChange={onMapStyleChange}
          onBoundsChange={onBoundsChange}
          onUserViewportFramed={onUserViewportFramed}
          onMapClick={onMapClick}
          zoom={10}
          focusBounds={focusBounds}
          fitBoundsMode="once"
          fitBoundsPadding={[48, 48]}
          zoomControlInset="container"
          className="h-full w-full"
        >
          {manualFramingActive ? (
            <FramingPreviewLayers
              gameArea={previewGameArea}
              framingMode={framingMode}
              circleCenter={circleCenter}
              circleRadiusMeters={circleRadiusMeters}
              polygonVertices={polygonVertices}
            />
          ) : previewGameArea ? (
            <GameAreaMask gameArea={previewGameArea} framing />
          ) : null}
        </MapView>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-banner)] flex justify-center px-3 pb-3">
        {previewGameArea ? (
          <div className="hud-panel max-w-full px-3 py-2.5 pt-3.5">
            <GameAreaFramingStats
              gameArea={previewGameArea}
              selectedGameSize={selectedGameSize}
              compact
            />
          </div>
        ) : (
          <div className="hud-panel max-w-md px-3 py-2.5 pt-3.5">
            <p className="text-xs leading-snug text-ink-secondary">
              {manualFramingActive
                ? framingModeHint(framingMode)
                : "Search a place or draw on the map."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
