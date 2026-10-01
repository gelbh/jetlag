import {
  memo,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Paper, Text } from "@mantine/core";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapBounds, MapBoundsExpression } from "@/domain/map/mapBounds";
import { scheduleWhenIdleAfterLoad } from "@/domain/device/perf/scheduleWhenIdleAfterLoad";
import { MapView } from "../../map/chrome/MapView";
import { useMapLibreMap } from "../../map/helpers/useMapLibreMap";
import { FramingPreviewLayers } from "../../map/layers/FramingPreviewLayers";
import { GameAreaMask } from "../../map/layers/GameAreaMask";
import type { GameArea } from "@/domain/map/annotations";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import type { FramingMode } from "@/hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { GameAreaFramingStats } from "./GameAreaFramingControls";
import { framingModeHint } from "./gameAreaFramingUi";
import { type GameSize } from "@/domain/session/size/gameSize";
import { CreateSessionMapFacade } from "./CreateSessionMapFacade";
import { prefetchCreateSessionMap } from "./prefetchCreateSessionMap";

const mapHintPanelStyles = {
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.92)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
} as const;

/** Shared outer shell so placeholder and live map keep identical layout (CLS). */
export const CREATE_SESSION_MAP_SHELL_CLASS =
  "relative h-[33dvh] max-h-[36dvh] min-h-[28dvh] shrink-0 touch-none";

interface CreateSessionMapPaneProps {
  mapStyle: MapStyle;
  focusBounds: MapBoundsExpression | null;
  previewGameArea: GameArea | null;
  selectedGameSize: GameSize;
  manualFramingActive: boolean;
  framingMode: FramingMode;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
  /** Some intent asked for the live map; until then a static facade stands in. */
  mapRequested: boolean;
  /** MapLibre loaded and reported its first viewport. */
  mapMounted: boolean;
  onRequestMap: () => void;
  onMapMounted: (map: MapLibreMap | null) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  onUserViewportFramed: () => void;
  onMapClick?: (lat: number, lng: number) => void;
}

function CreateSessionMapShell({ children }: { children?: ReactNode }) {
  return <div className={CREATE_SESSION_MAP_SHELL_CLASS}>{children}</div>;
}

function CreateSessionMapMountSignal({
  onMapInstance,
}: {
  onMapInstance: (map: MapLibreMap | null) => void;
}) {
  const mapRef = useMapLibreMap();
  const onMapInstanceRef = useRef(onMapInstance);
  useEffect(() => {
    onMapInstanceRef.current = onMapInstance;
  }, [onMapInstance]);
  // Keyed on the MapRef only: a callback identity change must not read as an
  // unmount (that would drop the first-viewport signal).
  useEffect(() => {
    onMapInstanceRef.current(mapRef.getMap());
    return () => onMapInstanceRef.current(null);
  }, [mapRef]);
  return null;
}

function CreateSessionMapPaneInner({
  mapStyle,
  focusBounds,
  previewGameArea,
  selectedGameSize,
  manualFramingActive,
  framingMode,
  circleCenter,
  circleRadiusMeters,
  polygonVertices,
  mapRequested,
  mapMounted,
  onRequestMap,
  onMapMounted,
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
}: CreateSessionMapPaneProps) {
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const boundsSeenRef = useRef(false);
  const mountSignaledRef = useRef(false);
  const focusMapOnMountRef = useRef(false);

  useEffect(() => {
    if (mapRequested) {
      return;
    }
    return scheduleWhenIdleAfterLoad(() => {
      void prefetchCreateSessionMap();
    });
  }, [mapRequested]);

  // Mounted = MapLibre instance exists AND it has reported its first viewport,
  // so ensureMapMounted() waiters see the framed rectangle in the same commit.
  const signalMountedIfReady = useCallback(() => {
    const map = mapInstanceRef.current;
    if (mountSignaledRef.current || !map || !boundsSeenRef.current) {
      return;
    }
    mountSignaledRef.current = true;
    onMapMounted(map);
    if (focusMapOnMountRef.current) {
      focusMapOnMountRef.current = false;
      map.getCanvas().focus();
    }
  }, [onMapMounted]);

  const handleMapInstance = useCallback(
    (map: MapLibreMap | null) => {
      mapInstanceRef.current = map;
      if (map) {
        signalMountedIfReady();
        return;
      }
      boundsSeenRef.current = false;
      if (mountSignaledRef.current) {
        mountSignaledRef.current = false;
        onMapMounted(null);
      }
    },
    [onMapMounted, signalMountedIfReady],
  );

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      onBoundsChange(bounds);
      boundsSeenRef.current = true;
      signalMountedIfReady();
    },
    [onBoundsChange, signalMountedIfReady],
  );

  const handleFacadeActivate = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Keyboard activation (detail 0): keep focus in the map once it exists.
      focusMapOnMountRef.current = event.detail === 0;
      onRequestMap();
    },
    [onRequestMap],
  );

  const handlePrefetchIntent = useCallback(() => {
    void prefetchCreateSessionMap();
  }, []);

  if (!mapRequested) {
    return (
      <CreateSessionMapShell>
        <CreateSessionMapFacade
          loading={false}
          onActivate={handleFacadeActivate}
          onPrefetchIntent={handlePrefetchIntent}
        />
      </CreateSessionMapShell>
    );
  }

  return (
    <CreateSessionMapShell>
      <div className="absolute inset-0">
        <MapView
          model={{
            mapStyle,
            onBoundsChange: handleBoundsChange,
            onUserViewportFramed,
            onMapClick,
            zoom: 10,
            focusBounds,
            fitBoundsMode: "once",
            fitBoundsPadding: [48, 48],
            zoomControlInset: "container",
            showZoomControl: false,
            showMapStyleToggle: false,
            showCompassControl: false,
            className: "h-full w-full",
          }}
        >
          <CreateSessionMapMountSignal onMapInstance={handleMapInstance} />
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

      {!mapMounted ? <CreateSessionMapFacade loading /> : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-banner)] flex justify-center px-3 pb-3">
        {previewGameArea ? (
          <Paper
            className="max-w-full"
            radius={14}
            px="sm"
            py="xs"
            style={mapHintPanelStyles}
          >
            <GameAreaFramingStats
              gameArea={previewGameArea}
              selectedGameSize={selectedGameSize}
              compact
            />
          </Paper>
        ) : mapMounted ? (
          <Paper
            className="max-w-md"
            radius={14}
            px="sm"
            py="xs"
            style={mapHintPanelStyles}
          >
            <Text size="xs" c="var(--color-field-ink-muted)" lh={1.35}>
              {manualFramingActive
                ? framingModeHint(framingMode)
                : "Search a place or draw on the map."}
            </Text>
          </Paper>
        ) : null}
      </div>
    </CreateSessionMapShell>
  );
}

export const CreateSessionMapPane = memo(CreateSessionMapPaneInner);
