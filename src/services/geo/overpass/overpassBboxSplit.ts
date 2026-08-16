import { OverpassPayloadTooLargeError } from "../../core/overpass/overpassClient";

export const OVERPASS_SPLIT_MIN_SPAN_DEG = 0.02;

export type OverpassBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function bboxAtMinimum(bbox: OverpassBbox): boolean {
  return (
    bbox.north - bbox.south <= OVERPASS_SPLIT_MIN_SPAN_DEG &&
    bbox.east - bbox.west <= OVERPASS_SPLIT_MIN_SPAN_DEG
  );
}

export function splitOverpassBbox(bbox: OverpassBbox): OverpassBbox[] {
  const midLat = (bbox.south + bbox.north) / 2;
  const midLng = (bbox.west + bbox.east) / 2;
  return [
    { south: bbox.south, west: bbox.west, north: midLat, east: midLng },
    { south: bbox.south, west: midLng, north: midLat, east: bbox.east },
    { south: midLat, west: bbox.west, north: bbox.north, east: midLng },
    { south: midLat, west: midLng, north: bbox.north, east: bbox.east },
  ];
}

export function mergeOverpassElementPayloads<
  T extends { id: number; type?: string },
>(parts: { elements: T[] }[]): { elements: T[] } {
  const seen = new Set<string>();
  const elements: T[] = [];
  for (const part of parts) {
    for (const element of part.elements) {
      const key = `${element.type ?? ""}:${element.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      elements.push(element);
    }
  }
  return { elements };
}

export async function queryOverpassWithBboxSplit<T>(
  buildQuery: (bbox: OverpassBbox) => string,
  bbox: OverpassBbox,
  query: (ql: string) => Promise<T>,
  merge: (parts: T[]) => T,
): Promise<T> {
  try {
    return await query(buildQuery(bbox));
  } catch (error) {
    if (!(error instanceof OverpassPayloadTooLargeError)) {
      throw error;
    }
    if (bboxAtMinimum(bbox)) {
      throw error;
    }
    const parts: T[] = [];
    for (const child of splitOverpassBbox(bbox)) {
      parts.push(
        await queryOverpassWithBboxSplit(buildQuery, child, query, merge),
      );
    }
    return merge(parts);
  }
}
