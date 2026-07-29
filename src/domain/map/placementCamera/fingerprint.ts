import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import { boundingBoxFromPositions } from "../../questions/overlays/draftOverlayBounds";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import type { MapTool } from "../mapToolTypes";
import type { PlacementPhase } from "./types";

function isVolatileWalkOverlay(overlay: MapDraftOverlay): boolean {
  return overlay.id.startsWith("thermo-draft-walk-");
}

function polygonFingerprint(
  overlay: Extract<MapDraftOverlay, { kind: "polygon" }>,
): Record<string, unknown> {
  const positions: LatLngTuple[] = [];

  if (overlay.feature.geometry.type === "Polygon") {
    for (const ring of overlay.feature.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        positions.push([lat, lng]);
      }
    }
  } else {
    for (const polygon of overlay.feature.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          positions.push([lat, lng]);
        }
      }
    }
  }

  const box = boundingBoxFromPositions(positions);

  return {
    kind: overlay.kind,
    id: overlay.id,
    south: box?.south,
    west: box?.west,
    north: box?.north,
    east: box?.east,
  };
}

function overlayFingerprintEntry(overlay: MapDraftOverlay): Record<string, unknown> {
  switch (overlay.kind) {
    case "marker":
      return { kind: overlay.kind, id: overlay.id, point: overlay.point };
    case "circle":
      return {
        kind: overlay.kind,
        id: overlay.id,
        radiusMeters: overlay.radiusMeters,
        point: overlay.center,
      };
    case "polyline":
      return { kind: overlay.kind, id: overlay.id, positions: overlay.positions };
    case "polygon":
      return polygonFingerprint(overlay);
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}

function eliminationBboxHash(
  positions: Position[],
): string | null {
  if (positions.length === 0) {
    return null;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of positions) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const round = (value: number) => value.toFixed(6);

  return [
    round(minLng),
    round(minLat),
    round(maxLng),
    round(maxLat),
  ].join(",");
}

export interface PlacementCameraFingerprintInput {
  tool: MapTool;
  phase: PlacementPhase;
  overlays: readonly MapDraftOverlay[];
  eliminationFeatures: readonly { geometry: { type: string } }[];
  selectedPoiId?: string | null;
  seekerResolving?: boolean;
  eliminationPreview?: boolean;
  walkActive?: boolean;
  walkCurrentPoint?: [number, number] | null;
}

export function placementCameraFingerprint(
  input: PlacementCameraFingerprintInput,
): string {
  const structural = input.overlays.filter(
    (overlay) => !isVolatileWalkOverlay(overlay),
  );

  const eliminationPositions: Position[] = [];
  if (input.phase === "answered" || input.seekerResolving || input.eliminationPreview) {
    for (const feature of input.eliminationFeatures) {
      if (feature.geometry.type === "Polygon") {
        for (const ring of (feature as Feature<Polygon>).geometry.coordinates) {
          for (const pos of ring) {
            eliminationPositions.push(pos);
          }
        }
      } else if (feature.geometry.type === "MultiPolygon") {
        for (const polygon of (feature as Feature<MultiPolygon>).geometry
          .coordinates) {
          for (const ring of polygon) {
            for (const pos of ring) {
              eliminationPositions.push(pos);
            }
          }
        }
      }
    }
  }

  return JSON.stringify({
    overlays: structural.map(overlayFingerprintEntry),
    tool: input.tool,
    phase: input.phase,
    selectedPoiId: input.selectedPoiId ?? null,
    seekerResolving: input.seekerResolving ?? false,
    eliminationPreview: input.eliminationPreview ?? false,
    walkActive: input.walkActive ?? false,
    walkCurrentPoint: input.walkCurrentPoint ?? null,
    eliminationHash: eliminationBboxHash(eliminationPositions),
  });
}
