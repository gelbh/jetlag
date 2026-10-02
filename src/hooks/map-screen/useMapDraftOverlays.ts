import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  dispatchHalfPlane,
  dispatchRadarShadedRegion,
  type LatLngTuple,
} from "../../domain/geometry/gameArea/geometry";
import { EMPTY_GEOJSON_FEATURES } from "../../domain/geometry/masks/emptyFeatures";
import type { PolygonLodPhase } from "../../domain/geometry/progressive/polygonLod";
import { buildTentaclePoiAnswerEliminationRegion } from "../../domain/geometry/tentacle/tentacleGeometry";
import type { GameArea, TentaclePoi } from "../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import type { MapStyle, StreetBasemap } from "../../domain/map/mapBasemaps";
import { getBoundaryPreviewStyle } from "../../domain/map/mapBoundaryOverlayStyle";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import { tentacleDraftOverlayId } from "../../domain/map/tentacleDraftOverlay";
import {
  type RadarAnswer,
  radarShadedInsideFromAnswer,
  type ThermometerAnswer,
  thermometerShadedSide,
} from "../../domain/questions";
import { buildThermometerDraftOverlays } from "../../domain/questions/overlays/thermometer";
import type { MapTool } from "../../state/sessionStore";
import { paintPolygonLod } from "../tools/framework/paintPolygonLod";

export interface MapDraftOverlaySources {
  activeTool: MapTool;
  gameArea: GameArea;
  mapStyle: MapStyle;
  streetBasemap?: StreetBasemap;
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
    targetDistanceMeters: number;
    walkCurrentPoint: LatLngTuple | null;
    walkActive: boolean;
  };
  measuring: {
    seekerPoint: LatLngTuple | null;
    targetPoint: LatLngTuple | null;
    placePoints: LatLngTuple[];
    siteRadiusMeters: number | null;
    boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
    eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
    seekerResolving: boolean;
    categoryId?: string | null;
  };
  matching: {
    seekerPoint: LatLngTuple | null;
    nearestFeaturePoint: LatLngTuple | null;
    boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
    eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
    seekerResolving: boolean;
    categoryId?: string | null;
  };
  zone: { vertices: LatLngTuple[] };
  draw: { strokePoints: LatLngTuple[] };
}

export interface MapDraftOverlayResult {
  overlays: MapDraftOverlay[];
  eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[];
  tentacleLodPhase: PolygonLodPhase;
}

export async function buildMapDraftOverlays(
  sources: MapDraftOverlaySources,
): Promise<MapDraftOverlayResult> {
  const overlays: MapDraftOverlay[] = [];
  const eliminationFeatures: Feature<GeoPolygon | MultiPolygon>[] = [];
  const { activeTool, gameArea, mapStyle, streetBasemap = "light" } = sources;
  const c = MAP_ANNOTATION_COLORS;
  const boundaryPreviewStyle = getBoundaryPreviewStyle(mapStyle, streetBasemap);

  const pushBoundary = (id: string, feature: Feature<GeoPolygon | MultiPolygon> | null) => {
    if (!feature) {
      return;
    }

    overlays.push({
      kind: "polygon",
      id,
      feature,
      layer: "boundary",
      style: boundaryPreviewStyle,
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
      overlays.push({
        kind: "marker",
        id: "radar-draft-center",
        point: center,
        style: { fillColor: c.radar },
      });
    } else {
      pushElimination(
        await dispatchRadarShadedRegion(
          center,
          radiusMeters,
          gameArea,
          radarShadedInsideFromAnswer(answer),
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
    const displayRadius = hasPoiAnswer ? answerRadiusMeters : searchRadiusMeters;

    if (searchRadiusMeters > 0) {
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
    }
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
        feature: turfCircle(turfPoint([center[1], center[0]]), searchRadiusMeters / 1000, {
          steps: 64,
          units: "kilometers",
        }) as Feature<GeoPolygon>,
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
          id: tentacleDraftOverlayId(poi.id),
          point: [poi.lat, poi.lng],
          popup: poi.name,
          style: {
            tentaclePoiSelected: selected,
            tentacleCategoryId: poi.category,
          },
        });
      }

      if (hasPoiAnswer && selectedPoiId) {
        const region = await buildTentaclePoiAnswerEliminationRegion(
          center,
          searchRadiusMeters,
          pois,
          selectedPoiId,
          gameArea,
        );
        if (region) {
          pushElimination(region);
        }
      }
    }
  }

  if (activeTool === "thermometer") {
    const { thermoA, thermoB, answer } = sources.thermometer;
    overlays.push(
      ...buildThermometerDraftOverlays({
        thermoA,
        thermoB,
        answer,
        targetDistanceMeters: sources.thermometer.targetDistanceMeters,
        walkCurrentPoint: sources.thermometer.walkCurrentPoint,
        walkActive: sources.thermometer.walkActive,
      }),
    );

    if (thermoA && thermoB && answer) {
      pushElimination(
        await dispatchHalfPlane(
          thermoA,
          thermoB,
          gameArea,
          thermometerShadedSide(answer),
          "midpoint",
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
      categoryId,
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
        style: {
          fillColor: c.pinAccent,
          iconCategoryId: categoryId ?? undefined,
        },
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
      categoryId,
    } = sources.matching;

    if (seekerPoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-seeker",
        point: seekerPoint,
        style: {
          fillColor: c.pin,
          pulsing: seekerResolving,
          markerRadius: 7,
        },
      });
    }
    if (nearestFeaturePoint) {
      overlays.push({
        kind: "marker",
        id: "matching-draft-nearest",
        point: nearestFeaturePoint,
        style: {
          fillColor: c.pinAccent,
          iconCategoryId: categoryId ?? undefined,
        },
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

  if (activeTool === "draw" && sources.draw.strokePoints.length > 0) {
    overlays.push({
      kind: "polyline",
      id: "draw-draft-stroke",
      positions: sources.draw.strokePoints,
      style: { color: c.drawDraft, weight: 3 },
    });
  }

  return { overlays, eliminationFeatures, tentacleLodPhase: "complete" };
}

const EMPTY_DRAFT_RESULT: MapDraftOverlayResult = {
  overlays: [],
  eliminationFeatures: [],
  tentacleLodPhase: "complete",
};

export function useMapDraftOverlays(
  sources: MapDraftOverlaySources,
  extraEliminationFeatures: readonly Feature<GeoPolygon | MultiPolygon>[] = EMPTY_GEOJSON_FEATURES,
): MapDraftOverlayResult {
  const [built, setBuilt] = useState<MapDraftOverlayResult>(EMPTY_DRAFT_RESULT);
  const [tentacleDisplayElim, setTentacleDisplayElim] = useState<Feature<
    GeoPolygon | MultiPolygon
  > | null>(null);
  const [tentacleLodPhase, setTentacleLodPhase] = useState<PolygonLodPhase>("complete");
  const generationRef = useRef(0);
  const tentacleLodCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    tentacleLodCancelRef.current?.();
    tentacleLodCancelRef.current = null;
    queueMicrotask(() => {
      if (generation !== generationRef.current) {
        return;
      }
      setBuilt(EMPTY_DRAFT_RESULT);
      setTentacleDisplayElim(null);
      setTentacleLodPhase("complete");
    });

    void buildMapDraftOverlays(sources)
      .then((result) => {
        if (generation !== generationRef.current) {
          return;
        }
        setBuilt(result);
        const tentacleFull =
          sources.activeTool === "tentacle" ? (result.eliminationFeatures.at(-1) ?? null) : null;
        if (!tentacleFull) {
          return;
        }
        paintPolygonLod(
          tentacleFull,
          generation,
          generationRef,
          setTentacleDisplayElim,
          setTentacleLodPhase,
          tentacleLodCancelRef,
        );
      })
      .catch(() => {
        if (generation === generationRef.current) {
          setBuilt(EMPTY_DRAFT_RESULT);
        }
      });

    return () => {
      tentacleLodCancelRef.current?.();
      tentacleLodCancelRef.current = null;
    };
  }, [sources.activeTool, sources]);

  return useMemo(() => {
    const tentacleElms =
      tentacleDisplayElim && built.eliminationFeatures.length > 0
        ? [...built.eliminationFeatures.slice(0, -1), tentacleDisplayElim]
        : built.eliminationFeatures;
    return {
      overlays: built.overlays,
      eliminationFeatures: [...tentacleElms, ...extraEliminationFeatures],
      tentacleLodPhase,
    };
  }, [
    built.eliminationFeatures,
    built.overlays,
    extraEliminationFeatures,
    tentacleDisplayElim,
    tentacleLodPhase,
  ]);
}
