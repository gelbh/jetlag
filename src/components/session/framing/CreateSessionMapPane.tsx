import { ActionIcon, Paper, Text } from "@mantine/core";
import { CrosshairIcon } from "@phosphor-icons/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { scheduleWhenIdleAfterLoad } from "@/domain/device/perf/scheduleWhenIdleAfterLoad";
import type { GameArea } from "@/domain/map/annotations";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import type { MapBounds, MapBoundsExpression } from "@/domain/map/mapBounds";
import { type GameSize } from "@/domain/session/size/gameSize";
import { MapView } from "../../map/chrome/MapView";
import { useMapLibreMap } from "../../map/helpers/useMapLibreMap";
import { GameAreaMask } from "../../map/layers/GameAreaMask";
import { JlIcon } from "../../ui/brand/JlIcon";
import { CreateSessionMapFacade } from "./CreateSessionMapFacade";
import { GameAreaFramingStats } from "./GameAreaFramingControls";
import { prefetchCreateSessionMap } from "./prefetchCreateSessionMap";

const mapHintPanelStyles = {
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.92)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
} as const;

/** Matches the ensureMapMounted() timeout in useCreateSessionMapMount. */
const LOADING_PLATE_TIMEOUT_MS = 10_000;

/** Shared outer shell so placeholder and live map keep identical layout (CLS). */
export const CREATE_SESSION_MAP_SHELL_CLASS =
  "relative h-[33dvh] max-h-[36dvh] min-h-[28dvh] shrink-0 touch-none";

/** Symmetric fitBounds inset. */
export const CREATE_SESSION_FIT_PAD_PX = 48;

/**
 * Extra bottom inset when the compact play-area stats chip is on the map.
 * Overlay `pb-3` (12) + Paper `py-xs` (~20) + compact stats line (~20) + slack.
 */
export const CREATE_SESSION_STATS_OVERLAY_PAD_PX = 64;

const LOCATE_BTN_SIZE = 44;

const locateControlStyles = {
  root: {
    ...mapChromeSurfaceStyles,
    width: LOCATE_BTN_SIZE,
    height: LOCATE_BTN_SIZE,
    minWidth: LOCATE_BTN_SIZE,
    minHeight: LOCATE_BTN_SIZE,
    padding: 0,
    lineHeight: 0,
    borderRadius: 14,
    color: "var(--color-field-ink)",
    "&:disabled": {
      opacity: 0.4,
    },
  },
} as const;

interface CreateSessionMapPaneProps {
  mapStyle: MapStyle;
  focusBounds: MapBoundsExpression | null;
  mapFocusToken?: number;
  previewGameArea: GameArea | null;
  selectedGameSize: GameSize;
  /** Some intent asked for the live map; until then a static facade stands in. */
  mapRequested: boolean;
  /** MapLibre loaded and reported its first viewport. */
  mapMounted: boolean;
  onRequestMap: () => void;
  onMapMounted: (map: MapLibreMap | null) => void;
  /** Mount / camera reports only; strip map never mints framing drafts. */
  onBoundsChange?: (bounds: MapBounds) => void;
  onRequestLocation?: () => void;
  locationBusy?: boolean;
  locationStatus?: string | null;
  locationStatusTone?: "ok" | "halt" | null;
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
  mapFocusToken = 0,
  previewGameArea,
  selectedGameSize,
  mapRequested,
  mapMounted,
  onRequestMap,
  onMapMounted,
  onBoundsChange,
  onRequestLocation,
  locationBusy = false,
  locationStatus = null,
  locationStatusTone = null,
}: CreateSessionMapPaneProps) {
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const boundsSeenRef = useRef(false);
  const facadeRef = useRef<HTMLButtonElement>(null);
  const [loadingPlateExpired, setLoadingPlateExpired] = useState(false);

  useEffect(() => {
    if (mapRequested) {
      return;
    }
    return scheduleWhenIdleAfterLoad(() => {
      void prefetchCreateSessionMap();
    });
  }, [mapRequested]);

  // A map that never reports a viewport (no WebGL, style fetch failed) must not
  // stay hidden behind the busy plate forever.
  useEffect(() => {
    if (!mapRequested || mapMounted) {
      return;
    }
    const timeoutId = setTimeout(() => setLoadingPlateExpired(true), LOADING_PLATE_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [mapMounted, mapRequested]);

  // Mounted = MapLibre instance exists AND it has reported its first viewport,
  // so ensureMapMounted() waiters see the framed rectangle in the same commit.
  // Load and first bounds can arrive in either order.
  const signalMountedIfReady = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !boundsSeenRef.current) {
      return;
    }
    // The facade unmounts on this signal; keep focus in the map, not <body>.
    const facadeHadFocus =
      facadeRef.current !== null && document.activeElement === facadeRef.current;
    onMapMounted(map);
    if (facadeHadFocus) {
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
      onMapMounted(null);
    },
    [onMapMounted, signalMountedIfReady],
  );

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      onBoundsChange?.(bounds);
      if (boundsSeenRef.current) {
        return;
      }
      boundsSeenRef.current = true;
      signalMountedIfReady();
    },
    [onBoundsChange, signalMountedIfReady],
  );

  const handlePrefetchIntent = useCallback(() => {
    void prefetchCreateSessionMap();
  }, []);

  const loading = mapRequested && !mapMounted;

  return (
    <CreateSessionMapShell>
      {mapRequested ? (
        <div className="absolute inset-0">
          <MapView
            model={{
              mapStyle,
              onBoundsChange: handleBoundsChange,
              zoom: 10,
              focusBounds,
              recenterToken: mapFocusToken,
              onRecenter: () => undefined,
              fitBoundsMode: "once",
              fitBoundsPadding: [CREATE_SESSION_FIT_PAD_PX, CREATE_SESSION_FIT_PAD_PX],
              focusPaddingBias: previewGameArea ? CREATE_SESSION_STATS_OVERLAY_PAD_PX : 0,
              showZoomControl: false,
              showMapStyleToggle: false,
              showCompassControl: false,
              className: "h-full w-full",
            }}
          >
            <CreateSessionMapMountSignal onMapInstance={handleMapInstance} />
            {previewGameArea ? <GameAreaMask gameArea={previewGameArea} framing /> : null}
          </MapView>
        </div>
      ) : null}

      {/* Same slot before and after intent, so a focused facade stays mounted while busy. */}
      {!mapMounted && !(loading && loadingPlateExpired) ? (
        <CreateSessionMapFacade
          ref={facadeRef}
          loading={loading}
          onActivate={onRequestMap}
          onPrefetchIntent={handlePrefetchIntent}
        />
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {loading ? "Loading map…" : ""}
      </span>

      {onRequestLocation ? (
        <div className="pointer-events-none absolute top-3 right-3 z-[var(--z-banner)] flex max-w-[min(16rem,calc(100%-1.5rem))] flex-col items-end gap-2">
          <ActionIcon
            type="button"
            variant="default"
            size={LOCATE_BTN_SIZE}
            className="pointer-events-auto"
            aria-label={locationBusy ? "Locating…" : "Use my location"}
            disabled={locationBusy}
            onClick={(event) => {
              event.stopPropagation();
              onRequestLocation();
            }}
            styles={locateControlStyles}
          >
            <JlIcon icon={CrosshairIcon} size={20} weight="bold" className="block" />
          </ActionIcon>
          {locationStatus ? (
            <p
              role="status"
              className="rounded-[10px] px-2 py-1 text-right text-xs"
              style={{
                backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
                color:
                  locationStatusTone === "halt"
                    ? "var(--color-halt)"
                    : "var(--color-field-ink-muted)",
              }}
            >
              {locationStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      {mapRequested ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-banner)] flex justify-center px-3 pb-3">
          {previewGameArea ? (
            <Paper className="max-w-full" radius={14} px="sm" py="xs" style={mapHintPanelStyles}>
              <GameAreaFramingStats
                gameArea={previewGameArea}
                selectedGameSize={selectedGameSize}
                compact
              />
            </Paper>
          ) : mapMounted ? (
            <Paper className="max-w-md" radius={14} px="sm" py="xs" style={mapHintPanelStyles}>
              <Text size="xs" c="var(--color-field-ink-muted)" lh={1.35}>
                Search a place, load a preset, or open Draw.
              </Text>
            </Paper>
          ) : null}
        </div>
      ) : null}
    </CreateSessionMapShell>
  );
}

export const CreateSessionMapPane = memo(CreateSessionMapPaneInner);
