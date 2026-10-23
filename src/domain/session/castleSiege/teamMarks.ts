import type { MultiPolygon, Polygon, Position } from "geojson";

/** Team shade marks synced once Standoff starts (V12: enemy clients never read raw polygons). */

export type TeamMarksGeometry = Polygon | MultiPolygon;

function isFinitePosition(pos: Position): boolean {
  return (
    Array.isArray(pos) &&
    pos.length >= 2 &&
    typeof pos[0] === "number" &&
    typeof pos[1] === "number" &&
    Number.isFinite(pos[0]) &&
    Number.isFinite(pos[1])
  );
}

function ringClosed(ring: Position[]): boolean {
  if (ring.length < 4) {
    return false;
  }
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1];
}

function normalizePolygon(polygon: Polygon): Polygon | null {
  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) {
    return null;
  }
  const rings: Position[][] = [];
  for (const ring of polygon.coordinates) {
    if (!Array.isArray(ring) || !ring.every(isFinitePosition) || !ringClosed(ring)) {
      return null;
    }
    rings.push(ring.map((p) => [p[0]!, p[1]!]));
  }
  if (rings.length === 0) {
    return null;
  }
  return { type: "Polygon", coordinates: rings };
}

/** Accept Polygon or MultiPolygon; drop empty / non-finite / unclosed rings. */
export function normalizeTeamMarksGeometry(value: unknown): TeamMarksGeometry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const geom = value as { type?: string; coordinates?: unknown };
  if (geom.type === "Polygon") {
    return normalizePolygon(geom as Polygon);
  }
  if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
    const polys: Position[][][] = [];
    for (const coords of geom.coordinates) {
      const poly = normalizePolygon({ type: "Polygon", coordinates: coords as Position[][] });
      if (!poly) {
        return null;
      }
      polys.push(poly.coordinates);
    }
    if (polys.length === 0) {
      return null;
    }
    return { type: "MultiPolygon", coordinates: polys };
  }
  return null;
}

/** Merge additional polygons into a MultiPolygon (or return the single polygon). */
export function mergeTeamMarks(
  existing: TeamMarksGeometry | null,
  addition: TeamMarksGeometry,
): TeamMarksGeometry {
  const parts: Position[][][] = [];
  const push = (g: TeamMarksGeometry) => {
    if (g.type === "Polygon") {
      parts.push(g.coordinates);
    } else {
      parts.push(...g.coordinates);
    }
  };
  if (existing) {
    push(existing);
  }
  push(addition);
  if (parts.length === 1) {
    return { type: "Polygon", coordinates: parts[0]! };
  }
  return { type: "MultiPolygon", coordinates: parts };
}
