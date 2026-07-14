import type { LatLngTuple } from "../../geometry/geometry";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import { radarInsideFromAnswer } from "../../questions";
import {
  approximatePlayAreaContextMinZoom,
  boundsForGeoJsonFeatures,
  boundsForPinPoint,
  boundsForPlayArea,
  boundsForRadarCircle,
  boundsForTwoPoints,
  boundsForVertexPolygon,
  boundingBoxToBoundsExpression,
  unionBounds,
} from "./bounds";
import { MAX_ZOOM_PIN, MAX_ZOOM_RADAR_CENTER, PANEL_PADDING_EXTRA_PX } from "./constants";
import type { CameraTarget, PlacementCameraContext } from "./types";

function findMarker(
  overlays: readonly MapDraftOverlay[],
  id: string,
): LatLngTuple | null {
  const overlay = overlays.find(
    (entry) => entry.kind === "marker" && entry.id === id,
  );
  return overlay?.kind === "marker" ? overlay.point : null;
}

function findCircle(
  overlays: readonly MapDraftOverlay[],
  id: string,
): { center: LatLngTuple; radiusMeters: number } | null {
  const overlay = overlays.find(
    (entry) => entry.kind === "circle" && entry.id === id,
  );
  if (overlay?.kind !== "circle") {
    return null;
  }
  return { center: overlay.center, radiusMeters: overlay.radiusMeters };
}

function collectPoiPoints(overlays: readonly MapDraftOverlay[]): LatLngTuple[] {
  return overlays
    .filter(
      (overlay) =>
        overlay.kind === "marker" && overlay.id.startsWith("tentacle-draft-poi-"),
    )
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
    minZoom:
      options.minZoom ??
      approximatePlayAreaContextMinZoom(ctx.gameArea, box),
    paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
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
    forceReframe: forceReframe || ctx.forceReframe,
  };
}

function computePinTarget(ctx: PlacementCameraContext): CameraTarget | null {
  const point = findMarker(ctx.overlays, "pin-draft");
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
      return {
        bounds: boundsForPlayArea(ctx.gameArea),
        minZoom: approximatePlayAreaContextMinZoom(ctx.gameArea, eliminationBox),
        paddingBiasPx: ctx.panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
        forceReframe: true,
      };
    }

    return answeredEliminationTarget(ctx);
  }

  const circle = findCircle(ctx.overlays, "radar-draft-range");
  const center = findMarker(ctx.overlays, "radar-draft-center");

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

  const center = findMarker(ctx.overlays, "tentacle-draft-center");
  const circle = findCircle(ctx.overlays, "tentacle-draft-range");

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
      return buildTarget(
        ctx,
        boundsForRadarCircle(thermoA, quietRadar?.radiusMeters ?? 0),
      );
    }

    return buildTarget(
      ctx,
      boundsForTwoPoints(points[0]!, points[1]!, extraRadii),
    );
  }

  if (thermoA && thermoB) {
    const extraRadii = quietRadar ? [quietRadar.radiusMeters] : [];
    return buildTarget(ctx, boundsForTwoPoints(thermoA, thermoB, extraRadii));
  }

  if (thermoA && quietRadar) {
    return buildTarget(
      ctx,
      boundsForRadarCircle(thermoA, quietRadar.radiusMeters),
    );
  }

  return null;
}

function computeMeasuringTarget(ctx: PlacementCameraContext): CameraTarget | null {
  if (ctx.phase === "answered") {
    return answeredEliminationTarget(ctx);
  }

  const seeker = findMarker(ctx.overlays, "measuring-draft-seeker");
  const target =
    findMarker(ctx.overlays, "measuring-draft-target") ??
    findMarker(ctx.overlays, "measuring-draft-place-1");

  if (seeker && target) {
    const siteCircles = ctx.overlays.filter(
      (overlay) =>
        overlay.kind === "circle" && overlay.id.startsWith("measuring-draft-site-"),
    );
    const extraRadii = siteCircles
      .filter((overlay): overlay is Extract<MapDraftOverlay, { kind: "circle" }> =>
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
    return answeredEliminationTarget(ctx);
  }

  const seeker = findMarker(ctx.overlays, "matching-draft-seeker");
  const nearest = findMarker(ctx.overlays, "matching-draft-nearest");

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
    .filter(
      (overlay) =>
        overlay.kind === "marker" && overlay.id.startsWith("zone-draft-vertex-"),
    )
    .map((overlay) => (overlay.kind === "marker" ? overlay.point : null))
    .filter((point): point is LatLngTuple => point !== null);

  const box = boundsForVertexPolygon(vertices);
  if (!box) {
    return null;
  }

  return buildTarget(ctx, box);
}

export function computePlacementCameraTarget(
  ctx: PlacementCameraContext,
): CameraTarget | null {
  if (ctx.phase === "idle" || ctx.tool === "none" || ctx.tool === "photo") {
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
    default: {
      const unreachable: never = ctx.tool;
      return unreachable;
    }
  }
}

