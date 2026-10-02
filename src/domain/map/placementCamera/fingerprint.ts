import type { Position } from "geojson";
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

function eliminationQuickHash(
  features: readonly { geometry: { type: string; coordinates?: unknown } }[],
): string | null {
  if (features.length === 0) {
    return null;
  }

  // Sample endpoints + vertex counts — do not walk every coordinate (yes-elim
  // multipolygons can be tens of thousands of verts and block the click path).
  const parts: string[] = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (geometry.type === "Polygon") {
      const ring = (geometry.coordinates as Position[][] | undefined)?.[0];
      const count = ring?.length ?? 0;
      const first = ring?.[0];
      const mid = count > 0 ? ring![Math.floor(count / 2)] : undefined;
      parts.push(
        `P:${count}:${first?.[0]?.toFixed(5) ?? ""}:${first?.[1]?.toFixed(5) ?? ""}:${mid?.[0]?.toFixed(5) ?? ""}:${mid?.[1]?.toFixed(5) ?? ""}`,
      );
    } else if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates as Position[][][] | undefined;
      const polyCount = polygons?.length ?? 0;
      const firstRing = polygons?.[0]?.[0];
      const count = firstRing?.length ?? 0;
      const first = firstRing?.[0];
      parts.push(
        `M:${polyCount}:${count}:${first?.[0]?.toFixed(5) ?? ""}:${first?.[1]?.toFixed(5) ?? ""}`,
      );
    } else {
      parts.push(geometry.type);
    }
  }

  return parts.join("|");
}

export interface PlacementCameraFingerprintInput {
  tool: MapTool;
  phase: PlacementPhase;
  overlays: readonly MapDraftOverlay[];
  eliminationFeatures: readonly { geometry: { type: string; coordinates?: unknown } }[];
  selectedPoiId?: string | null;
  seekerResolving?: boolean;
  eliminationPreview?: boolean;
  walkActive?: boolean;
  walkCurrentPoint?: [number, number] | null;
}

export function placementCameraFingerprint(input: PlacementCameraFingerprintInput): string {
  const structural = input.overlays.filter((overlay) => !isVolatileWalkOverlay(overlay));

  // Matching yes/no are complements of the same cell — keep the camera fingerprint
  // stable across flips so we do not flyTo on every tap.
  const eliminationHash =
    input.phase === "answered" || input.seekerResolving || input.eliminationPreview
      ? input.tool === "matching"
        ? input.eliminationFeatures.length > 0
          ? `matching:${input.eliminationFeatures.length}`
          : null
        : eliminationQuickHash(input.eliminationFeatures)
      : null;

  return JSON.stringify({
    overlays: structural.map(overlayFingerprintEntry),
    tool: input.tool,
    phase: input.phase,
    selectedPoiId: input.selectedPoiId ?? null,
    seekerResolving: input.seekerResolving ?? false,
    eliminationPreview: input.eliminationPreview ?? false,
    walkActive: input.walkActive ?? false,
    walkCurrentPoint: input.walkCurrentPoint ?? null,
    eliminationHash,
  });
}
