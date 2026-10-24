import type { ProgressNode } from "@/domain/progress/progressTree";
import { sizeBucket } from "@/domain/progress/stagePriors";
import { throwIfAborted } from "../../core/network/anySignal";
import {
  OverpassPayloadTooLargeError,
  OverpassQueryTooExpensiveError,
} from "../../core/overpass/overpassClient";

export const OVERPASS_SPLIT_MIN_SPAN_DEG = 0.02;

export type OverpassBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function isOverpassSplitError(error: unknown): boolean {
  return (
    error instanceof OverpassPayloadTooLargeError || error instanceof OverpassQueryTooExpensiveError
  );
}

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

export function mergeOverpassElementPayloads<T extends { id: number; type?: string }>(
  parts: { elements: T[] }[],
): { elements: T[] } {
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

export interface BboxSplitOptions {
  signal?: AbortSignal;
  /** Stage for the whole bbox; split into quadrant stages when Overpass rejects it. */
  node?: ProgressNode;
}

const KM_PER_DEGREE_LAT = 111.32;

/** Approximate bbox area, used to bucket duration history by query size. */
export function overpassBboxAreaKm2(bbox: OverpassBbox): number {
  const midLat = ((bbox.north + bbox.south) / 2) * (Math.PI / 180);
  const height = (bbox.north - bbox.south) * KM_PER_DEGREE_LAT;
  const width = (bbox.east - bbox.west) * KM_PER_DEGREE_LAT * Math.cos(midLat);
  return Math.abs(height * width);
}

export function overpassBboxSizeBucket(bbox: OverpassBbox): number {
  return sizeBucket(overpassBboxAreaKm2(bbox));
}

/** "Searching map data (part 2 of 4)", nesting as "(part 2 of 4, 1 of 4)". */
function partLabel(parentLabel: string, part: number, total: number): string {
  const nested = parentLabel.match(/^(.*) \((part .*)\)$/);
  return nested
    ? `${nested[1]} (${nested[2]}, ${part} of ${total})`
    : `${parentLabel} (part ${part} of ${total})`;
}

export async function queryOverpassWithBboxSplit<T>(
  buildQuery: (bbox: OverpassBbox) => string,
  bbox: OverpassBbox,
  query: (ql: string, node?: ProgressNode) => Promise<T>,
  merge: (parts: T[]) => T,
  options: BboxSplitOptions = {},
): Promise<T> {
  const { signal, node } = options;
  throwIfAborted(signal);
  try {
    return await query(buildQuery(bbox), node);
  } catch (error) {
    throwIfAborted(signal);
    if (!isOverpassSplitError(error)) {
      throw error;
    }
    if (bboxAtMinimum(bbox)) {
      throw error;
    }
    const children = splitOverpassBbox(bbox);
    const childNodes = node
      ? node.split(children.length, {
          ...node.spec,
          sizeBucket: overpassBboxSizeBucket(children[0]),
        })
      : [];
    const parts: T[] = [];
    for (const [index, child] of children.entries()) {
      throwIfAborted(signal);
      // The bar shows the deepest running stage, so the part count goes on the child.
      childNodes[index]?.setLabel(partLabel(node?.label ?? "", index + 1, children.length));
      parts.push(
        await queryOverpassWithBboxSplit(buildQuery, child, query, merge, {
          signal,
          node: childNodes[index],
        }),
      );
    }
    node?.setLabel(null);
    node?.finish();
    return merge(parts);
  }
}
