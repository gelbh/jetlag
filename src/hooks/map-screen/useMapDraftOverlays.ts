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
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

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
    seekerResolving: boolean;
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
    seekerResolving: boolean;
  };
  matching: {
    seekerPoint: LatLngTuple | null;
    nearestFeaturePoint: LatLngTuple | null;
    boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
    eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
    seekerResolving: boolean;
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
  const c = MAP_ANNOTATION_COLORS;

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
        color: c.boundary,
        fillColor: c.boundary,
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

    if (!answer) {
      overlays.push({
        kind: "circle",
        id: "radar-draft-range",
        center,
        radiusMeters,
        style: {
          color: c.radarDraft,
          dashArray: "6 6",
          fillOpacity: 0.08,
        },
      });
    }

    overlays.push({
      kind: "marker",
      id: "radar-draft-center",
      point: center,
      style: { fillColor: c.radar },
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
      seekerResolving,
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
        color: c.tentacleAccent,
        dashArray: outOfReach ? undefined : "6 6",
        fillOpacity: outOfReach || selectedPoiId ? 0.05 : 0.06,
      },
    });
    overlays.push({
      kind: "marker",
      id: "tentacle-draft-center",
      point: center,
      style: { fillColor: c.tentacle, pulsing: seekerResolving },
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
          color: c.tentacle,
          fillColor: c.tentacle,
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
            color: selected ? c.highlight : c.strokeLight,
            weight: selected ? 3 : 2,
            fillColor: c.tentacle,
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
        style: {
          fillColor: c.thermometerA,
          color: c.thermometerA,
          weight: 0,
        },
      });
    }
    if (thermoB) {
      overlays.push({
        kind: "marker",
        id: "thermo-draft-b",
        point: thermoB,
        style: {
          fillColor: c.thermometerB,
          color: c.thermometerB,
          weight: 0,
        },
      });
    }
    if (thermoA && thermoB) {
      overlays.push({
        kind: "polyline",
        id: "thermo-draft-axis",
        positions: [thermoA, thermoB],
        style: { color: c.thermometerAxis, weight: 4 },
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
      seekerResolving,
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
        style: { fillColor: c.pin, pulsing: seekerResolving },
      });
    }
    if (placePoints.length > 1) {
      for (const [index, place] of placePoints.entries()) {
        overlays.push({
          kind: "marker",
          id: `measuring-draft-place-${index}`,
          point: place,
          style: { fillColor: c.pinAccent, markerRadius: 6 },
        });
      }
    } else if (targetPoint) {
      overlays.push({
        kind: "marker",
        id: "measuring-draft-target",
        point: targetPoint,
        style: { fillColor: c.pinAccent },
      });
    }

    if (!eliminationPreview) {
      pushBoundary("measuring-draft-boundary", boundaryPreview);
    }
    pushElimination(eliminationPreview);
  }

  if (activeTool === "matching") {
    const {
      seekerPoint,
      nearestFeaturePoint,
      boundaryPreview,
      eliminationPreview,
      seekerResolving,
    } = sources.matching;

    if (seekerPoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-seeker",
        point: seekerPoint,
        style: { fillColor: c.pin, pulsing: seekerResolving },
      });
    }
    if (nearestFeaturePoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-nearest",
        point: nearestFeaturePoint,
        style: { fillColor: c.pinAccent },
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
          fillColor: c.zoneDraft,
          color: c.zoneDraft,
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
        style: { color: c.zoneDraft, weight: 2 },
      });
    }
  }

  return { overlays, eliminationFeatures };
}

export function useMapDraftOverlays(
  sources: MapDraftOverlaySources,
  extraEliminationFeatures: readonly Feature<GeoPolygon | MultiPolygon>[] = [],
): MapDraftOverlayResult {
  const {
    activeTool,
    gameArea,
    radar,
    pin,
    tentacle,
    thermometer,
    measuring,
    matching,
    zone,
  } = sources;

  return useMemo(() => {
    const built = buildMapDraftOverlays(sources);
    return {
      overlays: built.overlays,
      eliminationFeatures: [
        ...built.eliminationFeatures,
        ...extraEliminationFeatures,
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- field deps cover `sources` inputs
  }, [
    activeTool,
    extraEliminationFeatures,
    gameArea,
    matching.boundaryPreview,
    matching.eliminationPreview,
    matching.nearestFeaturePoint,
    matching.seekerPoint,
    matching.seekerResolving,
    measuring.boundaryPreview,
    measuring.eliminationPreview,
    measuring.placePoints,
    measuring.seekerPoint,
    measuring.seekerResolving,
    measuring.siteRadiusMeters,
    measuring.targetPoint,
    pin.point,
    radar.answer,
    radar.center,
    radar.radiusMeters,
    tentacle.answerRadiusMeters,
    tentacle.center,
    tentacle.outOfReach,
    tentacle.pois,
    tentacle.searchRadiusMeters,
    tentacle.seekerResolving,
    tentacle.selectedPoiId,
    thermometer.answer,
    thermometer.thermoA,
    thermometer.thermoB,
    zone.vertices,
  ]);
}
