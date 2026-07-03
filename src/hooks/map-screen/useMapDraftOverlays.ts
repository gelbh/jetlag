import { useMemo } from "react";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea, TentaclePoi } from "../../domain/annotations";
import type { MapDraftOverlay } from "../../domain/mapDraftOverlay";
import type { MapTool } from "../../state/sessionStore";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
  type LatLngTuple,
} from "../../domain/geometry";
import {
  radarInsideFromAnswer,
  type RadarAnswer,
} from "../../domain/radarQuestions";
import {
  thermometerShadedSide,
  type ThermometerAnswer,
} from "../../domain/thermometerQuestions";

export interface MapDraftOverlaySources {
  activeTool: MapTool;
  gameArea: GameArea;
  radar: {
    center: LatLngTuple | null;
    radiusMeters: number;
    answer: RadarAnswer | null;
  };
  pin: { point: LatLngTuple | null };
  tentacle: {
    center: LatLngTuple | null;
    searchRadiusMeters: number;
    answerRadiusMeters: number;
    pois: TentaclePoi[];
    selectedPoiId: string | null;
    outOfReach: boolean;
  };
  thermometer: {
    thermoA: LatLngTuple | null;
    thermoB: LatLngTuple | null;
    answer: ThermometerAnswer | null;
  };
  measuring: {
    seekerPoint: LatLngTuple | null;
    targetPoint: LatLngTuple | null;
    placePoints: LatLngTuple[];
    siteRadiusMeters: number | null;
    boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
    eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
  };
  matching: {
    seekerPoint: LatLngTuple | null;
    nearestFeaturePoint: LatLngTuple | null;
    boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
    eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
  };
  zone: { vertices: LatLngTuple[] };
}

export interface MapDraftOverlayResult {
  overlays: MapDraftOverlay[];
  eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[];
}

export function buildMapDraftOverlays(
  sources: MapDraftOverlaySources,
): MapDraftOverlayResult {
  const overlays: MapDraftOverlay[] = [];
  const eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[] = [];
  const { activeTool, gameArea } = sources;

  const pushBoundary = (
    id: string,
    feature: Feature<GeoPolygon | MultiPolygon> | null,
  ) => {
    if (!feature) {
      return;
    }

    overlays.push({
      kind: "polygon",
      id,
      feature,
      layer: "boundary",
      style: {
        color: "#38bdf8",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
        weight: 0,
      },
    });
  };

  const pushElimination = (feature: Feature<GeoPolygon | MultiPolygon> | null) => {
    if (feature) {
      eliminationFeatures.push(feature);
    }
  };

  if (activeTool === "radar" && sources.radar.center) {
    const { center, radiusMeters, answer } = sources.radar;
    overlays.push({
      kind: "circle",
      id: "radar-draft-range",
      center,
      radiusMeters,
      style: {
        color: "#38bdf8",
        dashArray: "6 6",
        fillOpacity: 0.08,
      },
    });
    overlays.push({
      kind: "marker",
      id: "radar-draft-center",
      point: center,
      style: { fillColor: "#38bdf8" },
    });

    if (answer) {
      pushElimination(
        buildRadarShadedRegion(
          center,
          radiusMeters,
          gameArea,
          radarInsideFromAnswer(answer),
        ),
      );
    }
  }

  if (activeTool === "pin" && sources.pin.point) {
    overlays.push({
      kind: "marker",
      id: "pin-draft",
      point: sources.pin.point,
    });
  }

  if (activeTool === "tentacle" && sources.tentacle.center) {
    const {
      center,
      searchRadiusMeters,
      answerRadiusMeters,
      pois,
      selectedPoiId,
      outOfReach,
    } = sources.tentacle;
    const hasPoiAnswer = !outOfReach && selectedPoiId !== null;
    const displayRadius = hasPoiAnswer
      ? answerRadiusMeters
      : searchRadiusMeters;

    overlays.push({
      kind: "circle",
      id: "tentacle-draft-range",
      center,
      radiusMeters: displayRadius,
      style: {
        color: "#4ade80",
        dashArray: outOfReach ? undefined : "6 6",
        fillOpacity: outOfReach || selectedPoiId ? 0.05 : 0.06,
      },
    });
    overlays.push({
      kind: "marker",
      id: "tentacle-draft-center",
      point: center,
      style: { fillColor: "#22c55e" },
    });

    if (outOfReach) {
      overlays.push({
        kind: "polygon",
        id: "tentacle-draft-out-of-reach",
        feature: turfCircle(
          turfPoint([center[1], center[0]]),
          searchRadiusMeters / 1000,
          { steps: 64, units: "kilometers" },
        ) as Feature<GeoPolygon>,
        layer: "decoration",
        style: {
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.35,
        },
      });
    } else {
      for (const poi of pois) {
        const selected = selectedPoiId === poi.id;
        overlays.push({
          kind: "marker",
          id: `tentacle-draft-poi-${poi.id}`,
          point: [poi.lat, poi.lng],
          popup: poi.name,
          style: {
            color: selected ? "#fef08a" : "#ffffff",
            weight: selected ? 3 : 2,
            fillColor: "#22c55e",
            markerRadius: selected ? 7 : 6,
          },
        });
      }
    }
  }

  if (activeTool === "thermometer") {
    const { thermoA, thermoB, answer } = sources.thermometer;
    if (thermoA) {
      overlays.push({
        kind: "marker",
        id: "thermo-draft-a",
        point: thermoA,
        style: { fillColor: "#f87171", color: "#f87171", weight: 0 },
      });
    }
    if (thermoB) {
      overlays.push({
        kind: "marker",
        id: "thermo-draft-b",
        point: thermoB,
        style: { fillColor: "#fb923c", color: "#fb923c", weight: 0 },
      });
    }
    if (thermoA && thermoB && answer) {
      pushElimination(
        buildHalfPlanePolygon(
          thermoA,
          thermoB,
          gameArea,
          thermometerShadedSide(answer),
        ),
      );
    }
  }

  if (activeTool === "measuring") {
    const {
      seekerPoint,
      targetPoint,
      placePoints,
      siteRadiusMeters,
      boundaryPreview,
      eliminationPreview,
    } = sources.measuring;

    if (siteRadiusMeters !== null) {
      for (const [index, place] of placePoints.entries()) {
        overlays.push({
          kind: "circle",
          id: `measuring-draft-site-${index}`,
          center: place,
          radiusMeters: siteRadiusMeters,
          style: { dashArray: "6 6", fillOpacity: 0.06 },
        });
      }
    }
    if (seekerPoint) {
      overlays.push({
        kind: "marker",
        id: "measuring-draft-seeker",
        point: seekerPoint,
        style: { fillColor: "#38bdf8" },
      });
    }
    if (placePoints.length > 1) {
      for (const [index, place] of placePoints.entries()) {
        overlays.push({
          kind: "marker",
          id: `measuring-draft-place-${index}`,
          point: place,
          style: { fillColor: "#0ea5e9", markerRadius: 6 },
        });
      }
    } else if (targetPoint) {
      overlays.push({
        kind: "marker",
        id: "measuring-draft-target",
        point: targetPoint,
        style: { fillColor: "#0ea5e9" },
      });
    }

    if (!eliminationPreview) {
      pushBoundary("measuring-draft-boundary", boundaryPreview);
    }
    pushElimination(eliminationPreview);
  }

  if (activeTool === "matching") {
    const { seekerPoint, nearestFeaturePoint, boundaryPreview, eliminationPreview } =
      sources.matching;

    if (seekerPoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-seeker",
        point: seekerPoint,
        style: { fillColor: "#38bdf8" },
      });
    }
    if (nearestFeaturePoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-nearest",
        point: nearestFeaturePoint,
        style: { fillColor: "#0ea5e9" },
      });
    }

    if (!eliminationPreview) {
      pushBoundary("matching-draft-boundary", boundaryPreview);
    }
    pushElimination(eliminationPreview);
  }

  if (activeTool === "zone") {
    for (const [index, vertex] of sources.zone.vertices.entries()) {
      overlays.push({
        kind: "marker",
        id: `zone-draft-vertex-${index}`,
        point: vertex,
        style: {
          fillColor: "#c084fc",
          color: "#c084fc",
          weight: 0,
          markerRadius: 6,
        },
      });
    }
    if (sources.zone.vertices.length > 0) {
      overlays.push({
        kind: "polyline",
        id: "zone-draft-outline",
        positions: [...sources.zone.vertices, sources.zone.vertices[0]!],
        style: { color: "#c084fc", weight: 2 },
      });
    }
  }

  // Tentacle Voronoi elimination is computed in the hook and merged by the caller.
  return { overlays, eliminationFeatures };
}

export function useMapDraftOverlays(
  sources: MapDraftOverlaySources,
  extraEliminationFeatures: readonly Feature<GeoPolygon | MultiPolygon>[] = [],
): MapDraftOverlayResult {
  return useMemo(() => {
    const built = buildMapDraftOverlays(sources);
    return {
      overlays: built.overlays,
      eliminationFeatures: [
        ...built.eliminationFeatures,
        ...extraEliminationFeatures,
      ],
    };
  }, [sources, extraEliminationFeatures]);
}
