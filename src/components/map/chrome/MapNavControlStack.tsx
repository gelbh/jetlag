import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ActionIcon, Box, Stack } from "@mantine/core";
import {
  getMapBasemap,
  type MapStyle,
  type StreetBasemap,
} from "@/domain/map/mapBasemaps";
import { previewTileUrlsFromOrigin } from "@/domain/map/mapTilePreview";
import { useMapNavDockSide } from "@/hooks/map/useMapNavDockSide";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { HudCompassIcon, HudMinusIcon, HudPlusIcon } from "../../ui/brand/HudIcons";
import {
  useMapLibreInteracting,
  useMapLibreMap,
  useMapLibrePreviewTileOrigin,
} from "../helpers/useMapLibreMap";
import { MapDraggableFixedStack } from "./MapDraggableFixedStack";

const NAV_BTN_SIZE = 44;

const navControlStyles = {
  root: {
    ...iosMapChromeSurfaceStyles,
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    minWidth: NAV_BTN_SIZE,
    minHeight: NAV_BTN_SIZE,
    borderRadius: 14,
    color: "var(--color-field-ink)",
    "&:disabled": {
      opacity: 0.4,
    },
  },
} as const;

const zoomIslandStyles = {
  ...iosMapChromeSurfaceStyles,
  width: NAV_BTN_SIZE,
  borderRadius: 14,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column" as const,
};

const zoomBtnStyles = {
  root: {
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    minWidth: NAV_BTN_SIZE,
    minHeight: NAV_BTN_SIZE,
    borderRadius: 0,
    border: "none",
    backgroundColor: "transparent",
    color: "var(--color-field-ink)",
    "&:disabled": {
      opacity: 0.4,
    },
  },
} as const;

type MapNavControlStackProps = {
  zoomEnabled: boolean;
  compassEnabled: boolean;
  styleEnabled: boolean;
  mapStyle: MapStyle;
  streetBasemap?: StreetBasemap;
  onMapStyleChange?: (style: MapStyle) => void;
  onResetCamera: () => void;
};

/**
 * Mantine iOS map nav (+ / − / compass / sat), one draggable stack like the
 * session tool dock. Portals into the MapLibre container.
 */
export function MapNavControlStack({
  zoomEnabled,
  compassEnabled,
  styleEnabled,
  mapStyle,
  streetBasemap = "light",
  onMapStyleChange,
  onResetCamera,
}: MapNavControlStackProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting();
  const { placement, setPlacement } = useMapNavDockSide();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [bearing, setBearing] = useState(() => map.getBearing());
  const tileOrigin = useMapLibrePreviewTileOrigin();

  useEffect(() => {
    const syncZoom = () => setZoom(map.getZoom());
    syncZoom();
    map.on("zoomend", syncZoom);
    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map]);

  useEffect(() => {
    const syncBearing = () => setBearing(map.getBearing());
    syncBearing();
    map.on("rotate", syncBearing);
    return () => {
      map.off("rotate", syncBearing);
    };
  }, [map]);

  const nextStyle = mapStyle === "standard" ? "satellite" : "standard";
  const previewBasemap = getMapBasemap(nextStyle, streetBasemap);
  const styleLabel =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";
  const satelliteActive = mapStyle === "satellite";
  const previewTileUrls = useMemo(
    () =>
      previewTileUrlsFromOrigin(
        nextStyle,
        tileOrigin.x,
        tileOrigin.y,
        undefined,
        streetBasemap,
      ),
    [nextStyle, streetBasemap, tileOrigin.x, tileOrigin.y],
  );

  const showStyle = styleEnabled && Boolean(onMapStyleChange);
  if (!portalTarget || (!zoomEnabled && !compassEnabled && !showStyle)) {
    return null;
  }

  return createPortal(
    <MapDraggableFixedStack
      placement={placement}
      setPlacement={setPlacement}
      testId="map-nav-dock-stack"
      ariaLabel="Map controls. Drag to reposition."
      chromeRole="nav"
      className="jl-map-nav-dock"
    >
      <Stack
        gap={8}
        data-map-interacting={interacting ? "true" : undefined}
        className="jl-map-nav-dock__inner"
      >
        {showStyle ? (
          <ActionIcon
            type="button"
            variant="default"
            aria-label={styleLabel}
            title={styleLabel}
            aria-pressed={satelliteActive}
            onClick={() => onMapStyleChange?.(nextStyle)}
            styles={{
              root: {
                ...navControlStyles.root,
                padding: 0,
                overflow: "hidden",
                borderColor: satelliteActive
                  ? "oklch(from var(--color-flag) l c h / 0.55)"
                  : iosMapChromeSurfaceStyles.border,
              },
            }}
          >
            <span className="map-style-control__preview">
              <span className="map-style-control__tiles" aria-hidden="true">
                {previewTileUrls.map((url, index) => (
                  <img
                    key={index}
                    className="map-style-control__tile"
                    src={url}
                    alt=""
                    decoding="async"
                    draggable={false}
                  />
                ))}
              </span>
              <span className="map-style-control__label">
                {previewBasemap.label}
              </span>
            </span>
          </ActionIcon>
        ) : null}

        {zoomEnabled ? (
          <Box style={zoomIslandStyles} className="jl-map-nav-dock__zoom">
            <ActionIcon
              type="button"
              variant="transparent"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= map.getMaxZoom()}
              onClick={() => map.zoomIn()}
              styles={zoomBtnStyles}
            >
              <HudPlusIcon className="h-5 w-5" />
            </ActionIcon>
            <Box
              aria-hidden
              style={{
                height: 1,
                marginInline: 8,
                backgroundColor:
                  "oklch(from var(--color-field-ink) l c h / 0.14)",
              }}
            />
            <ActionIcon
              type="button"
              variant="transparent"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= map.getMinZoom()}
              onClick={() => map.zoomOut()}
              styles={zoomBtnStyles}
            >
              <HudMinusIcon className="h-5 w-5" />
            </ActionIcon>
          </Box>
        ) : null}

        {compassEnabled ? (
          <ActionIcon
            type="button"
            variant="default"
            aria-label="Reset map orientation and view"
            title="Reset map orientation and view"
            onClick={onResetCamera}
            styles={navControlStyles}
          >
            <HudCompassIcon
              className="map-compass-control__needle h-5 w-5"
              style={{ transform: `rotate(${-bearing}deg)` }}
              aria-hidden
            />
          </ActionIcon>
        ) : null}
      </Stack>
    </MapDraggableFixedStack>,
    portalTarget,
  );
}
