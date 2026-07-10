import { useCallback, useMemo, useRef, useState } from "react";
import type { LatLngBounds, LatLngBoundsExpression } from "leaflet";
import { LatLngBounds as LeafletLatLngBounds } from "leaflet";
import type { GameArea } from "../../domain/map/annotations";
import type { BoundingBox } from "../../domain/geometry/gameAreaBounds";
import {
  boundsToGameArea,
  boundingBoxToLeafletBounds,
  boundingBoxHasMinimumSpan,
  centerToViewportEdgeRadiusMeters,
  circleToGameArea,
  gameAreaToBoundingBox,
  gameAreaToBoundsExpression,
  isUsableMapBounds,
  type LatLngTuple,
  verticesToGameArea,
} from "../../domain/geometry/geometry";

export type FramingMode = "rectangle" | "circle" | "polygon";

export interface GameAreaFramingResult {
  gameArea: GameArea;
  focusBounds: BoundingBox;
  placeLabel?: string;
}

const MIN_CIRCLE_RADIUS_METERS = 200;
const RECTANGLE_VIEWPORT_INSET_FRACTION = 0.12;

function insetMapBounds(bounds: LatLngBounds, fraction: number): LatLngBounds {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const latSpan = northEast.lat - southWest.lat;
  const lngSpan = northEast.lng - southWest.lng;
  return new LeafletLatLngBounds(
    [southWest.lat + latSpan * fraction, southWest.lng + lngSpan * fraction],
    [northEast.lat - latSpan * fraction, northEast.lng - lngSpan * fraction],
  );
}

interface UseGameAreaFramingOptions {
  initialMode?: FramingMode;
  initialGameArea?: GameArea | null;
  initialFocusBounds?: BoundingBox | null;
}

export function useGameAreaFraming(options: UseGameAreaFramingOptions = {}) {
  const [framingMode, setFramingModeState] = useState<FramingMode>(
    options.initialMode ?? "rectangle",
  );
  const [bounds, setBounds] = useState<LatLngBounds | null>(() => {
    if (options.initialFocusBounds) {
      return boundingBoxToLeafletBounds(options.initialFocusBounds);
    }

    return null;
  });
  const [focusBounds, setFocusBounds] =
    useState<LatLngBoundsExpression | null>(() =>
      options.initialFocusBounds
        ? [
            [options.initialFocusBounds.south, options.initialFocusBounds.west],
            [options.initialFocusBounds.north, options.initialFocusBounds.east],
          ]
        : null,
    );
  const [circleCenter, setCircleCenter] = useState<LatLngTuple | null>(null);
  const [polygonVertices, setPolygonVertices] = useState<LatLngTuple[]>([]);
  const [manualGameArea, setManualGameArea] = useState<GameArea | null>(
    options.initialGameArea ?? null,
  );
  const [userFramed, setUserFramed] = useState(
    Boolean(options.initialGameArea),
  );
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState(
    Boolean(options.initialGameArea) || !options.initialFocusBounds,
  );
  const ignoreViewportUpdatesRef = useRef(false);
  const boundsRef = useRef<LatLngBounds | null>(
    options.initialFocusBounds
      ? boundingBoxToLeafletBounds(options.initialFocusBounds)
      : null,
  );

  const suppressViewportUpdates = useCallback((durationMs = 600) => {
    ignoreViewportUpdatesRef.current = true;
    window.setTimeout(() => {
      ignoreViewportUpdatesRef.current = false;
    }, durationMs);
  }, []);

  const computeManualGameArea = useCallback(
    (
      mode: FramingMode,
      nextBounds: LatLngBounds | null,
      center: LatLngTuple | null,
      vertices: LatLngTuple[],
    ): GameArea | null => {
      if (mode === "rectangle" && nextBounds && isUsableMapBounds(nextBounds)) {
        return boundsToGameArea(
          insetMapBounds(nextBounds, RECTANGLE_VIEWPORT_INSET_FRACTION),
        );
      }

      if (
        mode === "circle" &&
        center &&
        nextBounds &&
        isUsableMapBounds(nextBounds)
      ) {
        const radiusMeters = centerToViewportEdgeRadiusMeters(
          center,
          nextBounds,
        );
        if (radiusMeters < MIN_CIRCLE_RADIUS_METERS) {
          return null;
        }

        return circleToGameArea(center, radiusMeters);
      }

      if (mode === "polygon") {
        return verticesToGameArea(vertices);
      }

      return null;
    },
    [],
  );

  const handleBoundsChange = useCallback(
    (nextBounds: LatLngBounds) => {
      if (ignoreViewportUpdatesRef.current || !isUsableMapBounds(nextBounds)) {
        return;
      }

      boundsRef.current = nextBounds;

      setBounds((previous) => {
        if (previous) {
          const prevSw = previous.getSouthWest();
          const prevNe = previous.getNorthEast();
          const nextSw = nextBounds.getSouthWest();
          const nextNe = nextBounds.getNorthEast();
          const epsilon = 1e-6;

          if (
            Math.abs(prevSw.lat - nextSw.lat) < epsilon &&
            Math.abs(prevSw.lng - nextSw.lng) < epsilon &&
            Math.abs(prevNe.lat - nextNe.lat) < epsilon &&
            Math.abs(prevNe.lng - nextNe.lng) < epsilon
          ) {
            return previous;
          }
        }

        return nextBounds;
      });

      if (
        manualDrawingEnabled &&
        (framingMode === "rectangle" || framingMode === "circle")
      ) {
        const nextArea = computeManualGameArea(
          framingMode,
          nextBounds,
          circleCenter,
          polygonVertices,
        );
        if (nextArea) {
          setManualGameArea(nextArea);
        }
      }
    },
    [
      circleCenter,
      computeManualGameArea,
      framingMode,
      manualDrawingEnabled,
      polygonVertices,
    ],
  );

  const handleUserViewportFramed = useCallback(() => {
    if (ignoreViewportUpdatesRef.current || !manualDrawingEnabled) {
      return;
    }

    setUserFramed(true);
  }, [manualDrawingEnabled]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const point: LatLngTuple = [lat, lng];

      if (framingMode === "circle") {
        setManualDrawingEnabled(true);
        setCircleCenter(point);
        setUserFramed(true);
        const currentBounds = boundsRef.current;
        if (currentBounds) {
          const nextArea = computeManualGameArea(
            "circle",
            currentBounds,
            point,
            polygonVertices,
          );
          if (nextArea) {
            setManualGameArea(nextArea);
          }
        }
        return;
      }

      if (framingMode === "polygon") {
        setManualDrawingEnabled(true);
        setPolygonVertices((current) => [...current, point]);
        setUserFramed(true);
      }
    },
    [computeManualGameArea, framingMode, polygonVertices],
  );

  const closePolygon = useCallback(() => {
    const nextArea = verticesToGameArea(polygonVertices);
    if (!nextArea) {
      return false;
    }

    setManualDrawingEnabled(true);
    setManualGameArea(nextArea);
    setUserFramed(true);
    setFocusBounds(gameAreaToBoundsExpression(nextArea));
    suppressViewportUpdates();
    const nextBounds = boundingBoxToLeafletBounds(gameAreaToBoundingBox(nextArea));
    boundsRef.current = nextBounds;
    setBounds(nextBounds);
    return true;
  }, [polygonVertices, suppressViewportUpdates]);

  const resetPolygonVertices = useCallback(() => {
    setPolygonVertices([]);
    if (framingMode === "polygon") {
      setManualGameArea(null);
    }
  }, [framingMode]);

  const resetManualFraming = useCallback(() => {
    setManualGameArea(null);
    setCircleCenter(null);
    setPolygonVertices([]);
    setUserFramed(false);
    setManualDrawingEnabled(false);
  }, []);

  const setFramingMode = useCallback((mode: FramingMode) => {
    setFramingModeState(mode);
    setCircleCenter(null);
    setPolygonVertices([]);
    setManualGameArea(null);
    setManualDrawingEnabled(true);
    setUserFramed(true);
  }, []);

  const loadFramingResult = useCallback(
    (result: GameAreaFramingResult) => {
      const nextBounds = boundingBoxToLeafletBounds(
        gameAreaToBoundingBox(result.gameArea),
      );
      setManualDrawingEnabled(true);
      setManualGameArea(result.gameArea);
      setFocusBounds(gameAreaToBoundsExpression(result.gameArea));
      suppressViewportUpdates();
      boundsRef.current = nextBounds;
      setBounds(nextBounds);
      setUserFramed(true);
    },
    [suppressViewportUpdates],
  );

  const applyFocusToGameArea = useCallback(
    (gameArea: GameArea) => {
      const nextBounds = boundingBoxToLeafletBounds(
        gameAreaToBoundingBox(gameArea),
      );
      setFocusBounds(gameAreaToBoundsExpression(gameArea));
      suppressViewportUpdates();
      boundsRef.current = nextBounds;
      setBounds(nextBounds);
    },
    [suppressViewportUpdates],
  );

  const previewGameArea = useMemo(
    () => manualGameArea,
    [manualGameArea],
  );

  const hasValidDraft = useMemo(() => {
    if (!manualGameArea) {
      return false;
    }

    return boundingBoxHasMinimumSpan(gameAreaToBoundingBox(manualGameArea));
  }, [manualGameArea]);

  const circleRadiusMeters = useMemo(() => {
    if (!circleCenter || !bounds) {
      return null;
    }

    return centerToViewportEdgeRadiusMeters(circleCenter, bounds);
  }, [bounds, circleCenter]);

  return useMemo(
    () => ({
      framingMode,
      setFramingMode,
      bounds,
      focusBounds,
      circleCenter,
      circleRadiusMeters,
      polygonVertices,
      manualGameArea,
      previewGameArea,
      userFramed,
      hasValidDraft,
      ignoreViewportUpdatesRef,
      suppressViewportUpdates,
      handleBoundsChange,
      handleUserViewportFramed,
      handleMapClick,
      closePolygon,
      resetPolygonVertices,
      resetManualFraming,
      loadFramingResult,
      applyFocusToGameArea,
    }),
    [
      framingMode,
      setFramingMode,
      bounds,
      focusBounds,
      circleCenter,
      circleRadiusMeters,
      polygonVertices,
      manualGameArea,
      previewGameArea,
      userFramed,
      hasValidDraft,
      suppressViewportUpdates,
      handleBoundsChange,
      handleUserViewportFramed,
      handleMapClick,
      closePolygon,
      resetPolygonVertices,
      resetManualFraming,
      loadFramingResult,
      applyFocusToGameArea,
    ],
  );
}
