import type { GameArea } from "../../domain/map/annotations";
import {
  gameAreaToBoundingBox,
  type BoundingBox,
} from "../../domain/geometry/gameAreaBounds";

export const OVERPASS_JSON_QUERY_HEADER = "[out:json][timeout:25];";

export function formatOverpassBbox(box: BoundingBox): string {
  return `${box.south},${box.west},${box.north},${box.east}`;
}

export function formatOverpassBboxFromGameArea(gameArea: GameArea): string {
  return formatOverpassBbox(gameAreaToBoundingBox(gameArea));
}

export function overpassQueryTemplate(body: string): string {
  return `
    ${OVERPASS_JSON_QUERY_HEADER}
    ${body}
  `;
}

export function overpassTaggedBboxClauses(
  bbox: string,
  selectors: readonly string[],
): string[] {
  return selectors.flatMap((selector) => [
    `node${selector}(${bbox});`,
    `way${selector}(${bbox});`,
    `relation${selector}(${bbox});`,
  ]);
}
