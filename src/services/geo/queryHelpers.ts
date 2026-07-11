export {
  OVERPASS_JSON_QUERY_HEADER,
  formatOverpassBbox,
  formatOverpassBboxFromGameArea,
  overpassQueryTemplate,
  overpassTaggedBboxClauses,
} from "../overpass/query";

import {
  overpassQueryTemplate,
  overpassTaggedBboxClauses,
} from "../overpass/query";

export function buildTaggedBboxOverpassQuery(
  bbox: string,
  selectors: readonly string[],
  outClause = "out center 200;",
): string {
  const clauses = overpassTaggedBboxClauses(bbox, selectors);

  return overpassQueryTemplate(`
  (
    ${clauses.join("\n    ")}
  );
  ${outClause}
  `);
}

export function buildNodeWayRelationBboxClauses(
  bbox: string,
  selectors: readonly string[],
): string[] {
  return selectors.flatMap((selector) => [
    `node${selector}(${bbox});`,
    `way${selector}(${bbox});`,
    `relation${selector}(${bbox});`,
  ]);
}

export function buildNodeWayRelationBboxQuery(
  bbox: string,
  selectors: readonly string[],
  outClause = "out center 200;",
): string {
  const clauses = buildNodeWayRelationBboxClauses(bbox, selectors);

  return overpassQueryTemplate(`
  (
    ${clauses.join("\n    ")}
  );
  ${outClause}
  `);
}

export function buildAroundTaggedQuery(
  center: [number, number],
  radiusMeters: number,
  selectors: readonly string[],
  outClause = "out center 40;",
): string {
  const [lat, lng] = center;
  const clauses = selectors.flatMap((selector) => {
    const filter = selector.replace(/^\[/, "").replace(/\]$/, "");

    return [
      `node(around:${radiusMeters},${lat},${lng})[${filter}];`,
      `way(around:${radiusMeters},${lat},${lng})[${filter}];`,
    ];
  });

  return overpassQueryTemplate(`
  (
    ${clauses.join("\n      ")}
  );
  ${outClause}
  `);
}
