import { type BoundingBox, gameAreaToBoundingBox } from "../../geometry/gameArea/gameAreaBounds";
import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import { radarInsideFromAnswer } from "../../questions";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import {
  approximatePlayAreaContextMinZoom,
  boundingBoxToBoundsExpression,
  boundsForGeoJsonFeatures,
  boundsForPinPoint,
  boundsForPlayArea,
  boundsForRadarCircle,
  boundsForTwoPoints,
  boundsForVertexPolygon,
  unionBounds,
} from "./bounds";
import { MAX_ZOOM_PIN, MAX_ZOOM_RADAR_CENTER, PANEL_PADDING_EXTRA_PX } from "./constants";
import type { CameraTarget, PlacementCameraContext } from "./types";

function findMarker(overlays: readonly MapDraftOverlay[], id: string): LatLngTuple | null {
  const overlay = overlays.find((entry) => entry.kind === "marker" && entry.id === id);
  return overlay?.kind === "marker" ? overlay.point : null;
}

function findCircle(
  overlays: readonly MapDraftOverlay[],
  id: string,
): { center: LatLngTuple; radiusMeters: number } | null {
  const overlay = overlays.find((entry) => entry.kind === "circle" && entry.id === id);
  if (overlay?.kind !== "circle") {
    return null;
  }
  return { center: overlay.center, radiusMeters: overlay.radiusMeters };
}

function collectPoiPoints(overlays: readonly MapDraftOverlay[]): LatLngTuple[] {
  return overlays
    .filter((overlay) => overlay.kind === "marker" && overlay.id.startsWith("tentacle-draft-poi-"))
    .map((overlay) => (overlay.kind === "marker" ? overlay.point : null))
    .filter((point): point is LatLngTuple => point !== null);
}

function buildTarget(
  ctx: PlacementCameraContext,
  box: ReturnType<typeof boundsForPinPoint>,
  options: { maxZoom?: number; minZoom?: number; forceReframe?: boolean } = {},
): CameraTarget {
  return {
    bounds: boundingBoxToBoundsExpression(box),
    maxZoom: options.maxZoom,
    minZoom: options.minZoom ?? approximatePlayAreaContextMinZoom(ctx.gameArea, box),
    paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    paddingTopBiasPx: ctx.panelTopPaddingPx,
    forceReframe: options.forceReframe ?? ctx.forceReframe,
  };
}

function playAreaCameraTarget(
  ctx: PlacementCameraContext,
  options: {
    forceReframe?: boolean;
    /** When set, caps minZoom so a smaller feature stays in play-area context. */
    contextBox?: ReturnType<typeof boundsForPinPoint>;
  } = {},
): CameraTarget {
  return {
    bounds: boundsForPlayArea(ctx.gameArea),
    minZoom: options.contextBox
      ? approximatePlayAreaContextMinZoom(ctx.gameArea, options.contextBox)
      : undefined,
    paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    paddingTopBiasPx: ctx.panelTopPaddingPx,
    forceReframe: options.forceReframe ?? ctx.forceReframe,
  };
}

function answeredEliminationTarget(
  ctx: PlacementCameraContext,
  forceReframe = true,
): CameraTarget | null {
  const eliminationBox = boundsForGeoJsonFeatures(ctx.eliminationFeatures);
  if (!eliminationBox) {
    return null;
  }

  return {
    bounds: boundingBoxToBoundsExpression(eliminationBox),
    minZoom: approximatePlayAreaContextMinZoom(ctx.gameArea, eliminationBox),
    paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    paddingTopBiasPx: ctx.panelTopPaddingPx,
    forceReframe: forceReframe || ctx.forceReframe,
  };
}

function boundingBoxArea(box: BoundingBox): number {
  return Math.max(box.east - box.west, 0) * Math.max(box.north - box.south, 0);
}

/** Frame the shaded cell (no) or the kept pocket (yes) into the visible map band. */
function matchingAnsweredFocusBox(ctx: PlacementCameraContext): BoundingBox | null {
  const eliminationBox = boundsForGeoJsonFeatures(ctx.eliminationFeatures);
  if (!eliminationBox) {
    return null;
  }

  const playBox = gameAreaToBoundingBox(ctx.gameArea);
  if (boundingBoxArea(eliminationBox) <= boundingBoxArea(playBox) * 0.55) {
    return eliminationBox;
  }

  // Yes-elim is the large complement — frame seeker/nearest instead of
  // running safeDifference on the click/reframe path.
  const seeker = findMarker(ctx.overlays, "matching-draft-seeker");
  const nearest = findMarker(ctx.overlays, "matching-draft-nearest");
  if (seeker && nearest) {
    return boundsForTwoPoints(seeker, nearest);
  }
  if (nearest) {
    return boundsForPinPoint(nearest);
  }
  if (seeker) {
    return boundsForPinPoint(seeker);
  }

  return eliminationBox;
}

function matchingAnsweredTarget(ctx: PlacementCameraContext): CameraTarget | null {
  const focusBox = matchingAnsweredFocusBox(ctx);
  if (!focusBox) {
    return null;
  }

  return {
    bounds: boundingBoxToBoundsExpression(focusBox),
    // Fit the region into chrome-aware padding; do not floor to play-area zoom.
    paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    paddingTopBiasPx: ctx.panelTopPaddingPx,
    // First answered paint reframes via fingerprint; yes/no flips stay put.
    forceReframe: false,
  };
}

function computePinTarget(ctx: PlacementCameraContext): CameraTarget | null {
  const point = findMarker(ctx.overlays, "pin-draft") ?? ctx.draft.pin.point;
  if (!point) {
    return null;
  }

  return buildTarget(ctx, boundsForPinPoint(point), { maxZoom: MAX_ZOOM_PIN });
}

function computeRadarTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    const { center, radiusMeters, answer } = ctx.draft.radar;

    if (center && radiusMeters > 0 && answer && radarInsideFromAnswer(answer)) {
      const circleBox = boundsForRadarCircle(center, radiusMeters);
      return buildTarget(ctx, circleBox, { forceReframe: true });
    }

    const eliminationBox = boundsForGeoJsonFeatures(ctx.eliminationFeatures);
    if (eliminationBox) {
      return playAreaCameraTarget(ctx, {
        forceReframe: true,
        contextBox: eliminationBox,
      });
    }

    return answeredEliminationTarget(ctx);
  }

  const draftCenter = ctx.draft.radar.center;
  const draftRadius = ctx.draft.radar.radiusMeters;
  const circle =
    findCircle(ctx.overlays, "radar-draft-range") ??
    (draftCenter && draftRadius > 0 ? { center: draftCenter, radiusMeters: draftRadius } : null);
  const center = findMarker(ctx.overlays, "radar-draft-center") ?? draftCenter;

  if (circle) {
    return buildTarget(ctx, boundsForRadarCircle(circle.center, circle.radiusMeters), {
      maxZoom: MAX_ZOOM_RADAR_CENTER,
    });
  }

  if (center) {
    return buildTarget(ctx, boundsForPinPoint(center), {
      maxZoom: MAX_ZOOM_RADAR_CENTER,
    });
  }

  return null;
}

function computeTentacleTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    return answeredEliminationTarget(ctx);
  }

  const center = findMarker(ctx.overlays, "tentacle-draft-center") ?? ctx.draft.tentacle.center;
  const circle =
    findCircle(ctx.overlays, "tentacle-draft-range") ??
    (center && ctx.draft.tentacle.searchRadiusMeters > 0
      ? { center, radiusMeters: ctx.draft.tentacle.searchRadiusMeters }
      : null);

  if (!center) {
    return null;
  }

  if (ctx.phase === "pick_poi") {
    const selectedId = ctx.selectedPoiId;
    const selectedPoint =
      selectedId !== null && selectedId !== undefined
        ? findMarker(ctx.overlays, `tentacle-draft-poi-${selectedId}`)
        : null;

    const anchor = selectedPoint ?? center;
    const second = selectedPoint ? center : null;

    if (second) {
      const extraRadii = circle ? [circle.radiusMeters] : [];
      return buildTarget(ctx, boundsForTwoPoints(anchor, second, extraRadii));
    }

    return buildTarget(ctx, boundsForPinPoint(anchor), {
      maxZoom: MAX_ZOOM_RADAR_CENTER,
    });
  }

  if (circle) {
    let box = boundsForRadarCircle(circle.center, circle.radiusMeters);
    for (const poi of collectPoiPoints(ctx.overlays)) {
      box = unionBounds(box, boundsForPinPoint(poi));
    }
    return buildTarget(ctx, box);
  }

  return buildTarget(ctx, boundsForPinPoint(center), {
    maxZoom: MAX_ZOOM_RADAR_CENTER,
  });
}

function computeThermometerTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    return answeredEliminationTarget(ctx);
  }

  const thermoA = findMarker(ctx.overlays, "thermo-draft-a");
  const thermoB = findMarker(ctx.overlays, "thermo-draft-b");
  const quietRadar = findCircle(ctx.overlays, "thermo-draft-quiet-radar");
  const walkPoint = ctx.walkActive ? ctx.draft.thermometer.walkCurrentPoint : null;

  if (ctx.walkActive && thermoA) {
    const points: LatLngTuple[] = [thermoA];
    if (walkPoint) {
      points.push(walkPoint);
    }
    const extraRadii = quietRadar ? [quietRadar.radiusMeters] : [];

    if (points.length === 1) {
      return buildTarget(ctx, boundsForRadarCircle(thermoA, quietRadar?.radiusMeters ?? 0));
    }

    return buildTarget(ctx, boundsForTwoPoints(points[0]!, points[1]!, extraRadii));
  }

  if (thermoA && thermoB) {
    const extraRadii = quietRadar ? [quietRadar.radiusMeters] : [];
    return buildTarget(ctx, boundsForTwoPoints(thermoA, thermoB, extraRadii));
  }

  if (thermoA && quietRadar) {
    return buildTarget(ctx, boundsForRadarCircle(thermoA, quietRadar.radiusMeters));
  }

  return null;
}

function computeMeasuringTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    return answeredEliminationTarget(ctx);
  }

  const seeker =
    findMarker(ctx.overlays, "measuring-draft-seeker") ?? ctx.draft.measuring.seekerPoint;
  const target =
    findMarker(ctx.overlays, "measuring-draft-target") ??
    findMarker(ctx.overlays, "measuring-draft-place-1") ??
    ctx.draft.measuring.targetPoint;

  if (seeker && target) {
    const siteCircles = ctx.overlays.filter(
      (overlay) => overlay.kind === "circle" && overlay.id.startsWith("measuring-draft-site-"),
    );
    const extraRadii = siteCircles
      .filter(
        (overlay): overlay is Extract<MapDraftOverlay, { kind: "circle" }> =>
          overlay.kind === "circle",
      )
      .map((overlay) => overlay.radiusMeters);

    return buildTarget(ctx, boundsForTwoPoints(seeker, target, extraRadii));
  }

  if (seeker) {
    return buildTarget(ctx, boundsForPinPoint(seeker), { maxZoom: MAX_ZOOM_PIN });
  }

  return null;
}

function computeMatchingTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    return matchingAnsweredTarget(ctx);
  }

  const seeker =
    findMarker(ctx.overlays, "matching-draft-seeker") ?? ctx.draft.matching.seekerPoint;
  const nearest =
    findMarker(ctx.overlays, "matching-draft-nearest") ?? ctx.draft.matching.nearestFeaturePoint;

  if (seeker && nearest) {
    return buildTarget(ctx, boundsForTwoPoints(seeker, nearest));
  }

  if (seeker) {
    return buildTarget(ctx, boundsForPinPoint(seeker), { maxZoom: MAX_ZOOM_PIN });
  }

  return null;
}

function computeZoneTarget(ctx: PlacementCameraContext): CameraTarget | null {
  const vertices = ctx.overlays
    .filter((overlay) => overlay.kind === "marker" && overlay.id.startsWith("zone-draft-vertex-"))
    .map((overlay) => (overlay.kind === "marker" ? overlay.point : null))
    .filter((point): point is LatLngTuple => point !== null);

  const box = boundsForVertexPolygon(vertices);
  if (!box) {
    return null;
  }

  return buildTarget(ctx, box);
}

export function computePlacementCameraTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.tool === "none" || ctx.tool === "photo") {
    return null;
  }

  if (ctx.phase === "idle") {
    // Do not reframe on tool-open idle — camera motion races placement clicks.
    return null;
  }

  switch (ctx.tool) {
    case "pin":
      return computePinTarget(ctx);
    case "radar":
      return computeRadarTarget(ctx);
    case "tentacle":
      return computeTentacleTarget(ctx);
    case "thermometer":
      return computeThermometerTarget(ctx);
    case "measuring":
      return computeMeasuringTarget(ctx);
    case "matching":
      return computeMatchingTarget(ctx);
    case "zone":
      return computeZoneTarget(ctx);
    case "draw":
      return null;
    default: {
      const unreachable: never = ctx.tool;
      return unreachable;
    }
  }
}
